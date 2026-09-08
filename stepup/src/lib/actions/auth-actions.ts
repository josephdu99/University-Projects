"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { signIn, signOut, LOGIN_ERROR_MESSAGES } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { SIGNUP_ROLES } from "@/lib/roles";
import { isValidTimeZone, DEFAULT_TIMEZONE } from "@/lib/time";
import { AVATAR_COLORS, isAvatarColor } from "@/lib/avatar-colors";
import { issueToken, verifyToken, consumeToken, TOKEN_PURPOSE } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";

const AVATAR_EMOJIS = ["🕺", "💃", "⚡", "🌟", "🔥", "🎀", "🌊", "🎤", "🩰", "🚀"];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export type FormState = { error?: string; success?: string } | undefined;

// ─── Sign up ─────────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200)
    .refine((p) => !/^\d+$/.test(p), "Don't use only numbers")
    .refine(
      (p) => !["password123", "12345678910", "qwertyuiop"].includes(p.toLowerCase()),
      "That password is too common"
    ),
  role: z.enum(SIGNUP_ROLES),
  timezone: z.string().optional(),
  homeCity: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  studioName: z.string().trim().max(80).optional(),
  studioCity: z.string().trim().max(60).optional(),
  studioAddress: z.string().trim().max(120).optional(),
  studioDescription: z.string().trim().max(280).optional(),
});

export async function signUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;

  if (
    data.role === "STUDIO_OWNER" &&
    (!data.studioName || !data.studioCity || !data.studioAddress)
  ) {
    return { error: "Studio name, city and address are required." };
  }

  // Independent instructors have no venue, but their public name is captured
  // in the same field as a studio's on the signup form.
  if (data.role === "INSTRUCTOR" && !data.studioName) {
    return { error: "Add the name dancers will see on your classes." };
  }

  const timezone =
    data.timezone && isValidTimeZone(data.timezone) ? data.timezone : DEFAULT_TIMEZONE;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      timezone,
      homeCity: data.homeCity || null,
      bio: data.bio || null,
      // Independent instructors often teach under a brand rather than their
      // own name; that's what dancers should see on a class.
      displayName:
        data.role === "INSTRUCTOR" && data.studioName ? data.studioName : null,
      avatarEmoji: pick(AVATAR_EMOJIS),
      avatarColor: pick(AVATAR_COLORS),
      acceptedTermsAt: new Date(),
      ...(data.role === "STUDENT"
        ? { profile: { create: {} } }
        : {}),
      ...(data.role === "STUDIO_OWNER"
        ? {
            studio: {
              create: {
                name: data.studioName!,
                city: data.studioCity!,
                address: data.studioAddress!,
                description: data.studioDescription || "A local dance studio.",
                timezone,
              },
            },
          }
        : {}),
    },
  });

  // Verification is required before booking or hosting, but we sign them in
  // straight away so the app doesn't feel like a dead end while they wait.
  try {
    const token = await issueToken(user.id, TOKEN_PURPOSE.EMAIL_VERIFICATION);
    await sendVerificationEmail({ to: user.email, name: user.name, token });
  } catch (err) {
    logError("signup.verificationEmail", err, { userId: user.id });
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created, please log in." };
    }
    throw err;
  }
}

// ─── Log in / out ────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Enter your email and password." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code ?? "";
      return {
        error: LOGIN_ERROR_MESSAGES[code] ?? "Invalid email or password.",
      };
    }
    throw err;
  }
}

/**
 * Kicks off the Google OAuth redirect. Only reachable when the login page
 * renders the button, which it does only once credentials are configured.
 */
export async function googleLoginAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

// ─── Email verification ──────────────────────────────────────────────────────

export async function resendVerificationAction(): Promise<FormState> {
  const user = await requireUser();

  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, name: true, emailVerifiedAt: true },
  });
  if (record.emailVerifiedAt) return { success: "Your email is already verified." };

  const limit = await checkRateLimit(`verify:${record.email}`, 3, 15 * 60_000);
  if (!limit.allowed) {
    return { error: "We just sent one, check your inbox, or try again shortly." };
  }

  try {
    const token = await issueToken(user.id, TOKEN_PURPOSE.EMAIL_VERIFICATION);
    await sendVerificationEmail({ to: record.email, name: record.name, token });
  } catch (err) {
    logError("verify.resend", err, { userId: user.id });
    return { error: "Couldn't send the email. Please try again." };
  }

  return { success: "Verification email sent." };
}

export async function verifyEmailAction(token: string): Promise<FormState> {
  const check = await verifyToken(token, TOKEN_PURPOSE.EMAIL_VERIFICATION);
  if (!check.valid) return { error: check.reason };

  if (!(await consumeToken(check.tokenId))) {
    return { error: "This link has already been used." };
  }

  await db.user.update({
    where: { id: check.userId },
    data: { emailVerifiedAt: new Date() },
  });

  logInfo("auth.emailVerified", { userId: check.userId });
  return { success: "Email verified." };
}

// ─── Password reset ──────────────────────────────────────────────────────────

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email) return { error: "Enter your email address." };

  const limit = await checkRateLimit(`reset:${email}`, 5, 15 * 60_000);

  // Always report success — telling the caller whether an address exists would
  // turn this form into an account-enumeration oracle.
  const generic = {
    success: "If that email has an account, we've sent a reset link.",
  };
  if (!limit.allowed) return generic;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return generic;

  try {
    const token = await issueToken(user.id, TOKEN_PURPOSE.PASSWORD_RESET);
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });
  } catch (err) {
    logError("auth.resetEmail", err, { userId: user.id });
  }

  return generic;
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(10, "Use at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const check = await verifyToken(parsed.data.token, TOKEN_PURPOSE.PASSWORD_RESET);
  if (!check.valid) return { error: check.reason };

  if (!(await consumeToken(check.tokenId))) {
    return { error: "This link has already been used." };
  }

  await db.user.update({
    where: { id: check.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
  });

  logInfo("auth.passwordReset", { userId: check.userId });
  return { success: "Password updated. You can now log in." };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  displayName: z.string().trim().max(80).optional(),
  homeCity: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  timezone: z.string().refine(isValidTimeZone, "Pick a valid timezone"),
  // The dancer profile does not edit the emoji, so it is optional here and
  // left untouched when absent rather than being cleared.
  avatarEmoji: z.string().trim().min(1).max(8).optional(),
  avatarColor: z.string().refine(isAvatarColor, "Pick a valid colour"),
});

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      displayName: parsed.data.displayName || null,
      homeCity: parsed.data.homeCity || null,
      bio: parsed.data.bio || null,
      timezone: parsed.data.timezone,
      ...(parsed.data.avatarEmoji ? { avatarEmoji: parsed.data.avatarEmoji } : {}),
      avatarColor: parsed.data.avatarColor,
    },
  });

  revalidatePath("/profile");
  return { success: "Profile updated." };
}

/**
 * The leaderboard opt-in. Its own action rather than a field on the profile
 * form: appearing on a public board is a privacy decision, and it should take
 * one deliberate click rather than riding along with a name change.
 */
export async function updateLeaderboardVisibilityAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const optIn = formData.get("optIn") === "true";

  await db.user.update({
    where: { id: user.id },
    data: { leaderboardOptIn: optIn },
  });

  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  return {
    success: optIn
      ? "You'll appear on the leaderboard."
      : "You're hidden from the leaderboard.",
  };
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(10, "Use at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, email: true },
  });

  const limit = await checkRateLimit(`changepw:${record.email}`, 5, 15 * 60_000);
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const ok = await bcrypt.compare(parsed.data.current, record.passwordHash);
  if (!ok) return { error: "Your current password isn't right." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
  });

  logInfo("auth.passwordChanged", { userId: user.id });
  return { success: "Password changed." };
}

const studioSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(3).max(280),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(3).max(120),
  timezone: z.string().refine(isValidTimeZone, "Pick a valid timezone"),
  emoji: z.string().trim().min(1).max(8),
});

export async function updateStudioAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "STUDIO_OWNER") return { error: "Not allowed." };

  const parsed = studioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.studio.update({
    where: { ownerId: user.id },
    data: parsed.data,
  });

  revalidatePath("/studio");
  revalidatePath("/profile");
  return { success: "Studio updated." };
}
