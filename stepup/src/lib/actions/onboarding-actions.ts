"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { passwordSchema } from "@/lib/password-rules";
import { isValidAbn, abnDigits } from "@/lib/abn";
import { findSuburb } from "@/lib/suburbs";
import { parseContact } from "@/lib/team";
import { DANCE_STYLES, classProblems, draftFromForm } from "@/lib/class-form";
import { createFirstTimerClass } from "@/lib/first-timer-classes";
import { findInvite, inviteErrorMessage } from "@/lib/invites";
import { saveUploadedImage } from "@/lib/images";
import { issueToken, TOKEN_PURPOSE } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { AVATAR_COLORS } from "@/lib/avatar-colors";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import { logError } from "@/lib/logger";

/** Which step a problem belongs to, so the form can take you back there. */
export type OnboardStep = "account" | "studio" | "profile" | "class";
export type OnboardState = { error: string; step: OnboardStep } | undefined;

const STYLES = new Set<string>(DANCE_STYLES);
const YEARS = ["Less than 1", "1 to 3", "3 to 5", "5 to 10", "10+"];

const accountSchema = z.object({
  name: z.string().trim().min(2, "Add your full name").max(60, "That name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(24),
  password: passwordSchema,
});

const profileSchema = z.object({
  bio: z.string().trim().max(240, "Keep the bio to 240 characters"),
  note: z
    .string()
    .trim()
    .min(1, "Add a note to first-timers")
    .max(140, "Keep the note to 140 characters"),
  years: z.string().refine((v) => v === "" || YEARS.includes(v), "Pick how long you've taught"),
});

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function list(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string");
}

/** Sign-up attempts per address, so the forms can't mint accounts in bulk. */
async function underSignupLimit(kind: string): Promise<boolean> {
  const ip = hashIp((await headers()).get("x-forwarded-for")) ?? "unknown";
  const limit = await checkRateLimit(`${kind}:${ip}`, 10, 60 * 60_000);
  return limit.allowed;
}

function parseAccount(formData: FormData, mobileRequired: boolean) {
  const parsed = accountSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." } as const;
  }
  const phone = parsed.data.phone;
  const mobile = phone ? parseContact(phone) : null;
  if ((mobileRequired || phone) && mobile?.kind !== "mobile") {
    return { error: "Enter an Australian mobile, like 0412 345 678." } as const;
  }
  return { data: { ...parsed.data, phone: mobile?.value ?? null } } as const;
}

function parseProfile(formData: FormData) {
  const styles = list(formData, "teachStyles").filter((s) => STYLES.has(s));
  if (styles.length === 0) return { error: "Pick at least one style you teach." } as const;
  const parsed = profileSchema.safeParse({
    bio: text(formData, "bio"),
    note: text(formData, "note"),
    years: text(formData, "years"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your profile." } as const;
  }
  return { data: { ...parsed.data, styles } } as const;
}

async function emailTaken(email: string) {
  return (await db.user.findUnique({ where: { email }, select: { id: true } })) !== null;
}

async function sendVerification(user: { id: string; email: string; name: string }) {
  try {
    const token = await issueToken(user.id, TOKEN_PURPOSE.EMAIL_VERIFICATION);
    await sendVerificationEmail({ to: user.email, name: user.name, token });
  } catch (err) {
    logError("onboarding.verificationEmail", err, { userId: user.id });
  }
}

/** Sign the new account in and go on to its welcome page. */
async function signInTo(email: string, password: string, to: string): Promise<OnboardState> {
  try {
    await signIn("credentials", { email, password, redirectTo: to });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Your account is ready. Log in to carry on.", step: "account" };
    }
    throw err;
  }
}

// ─── Studio sign-up (/studios/join) ──────────────────────────────────────────

const studioSchema = z.object({
  studioName: z.string().trim().min(2, "Add the studio's name").max(80, "That studio name is too long"),
  address: z.string().trim().min(3, "Add the street address").max(120, "That address is too long"),
  arrive: z.string().trim().max(200, "Keep the door directions to 200 characters"),
  about: z.string().trim().max(280, "Keep the about to 280 characters"),
});

export async function createStudioAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  if (await getSessionUser()) {
    return { error: "You're already logged in. Log out to sign up a new studio.", step: "account" };
  }
  if (!(await underSignupLimit("studio-signup"))) {
    return { error: "Too many sign-ups from here. Try again in an hour.", step: "account" };
  }

  const account = parseAccount(formData, true);
  if ("error" in account) return { error: account.error!, step: "account" };
  const role = text(formData, "role") === "manager" ? "MANAGER" : "OWNER";

  const studio = studioSchema.safeParse({
    studioName: text(formData, "studioName"),
    address: text(formData, "address"),
    arrive: text(formData, "arrive"),
    about: text(formData, "about"),
  });
  if (!studio.success) {
    return { error: studio.error.issues[0]?.message ?? "Check the studio details.", step: "studio" };
  }
  const abn = text(formData, "abn");
  if (!isValidAbn(abn)) {
    return { error: "That ABN doesn’t look right. It should be 11 digits.", step: "studio" };
  }
  const suburb = findSuburb(text(formData, "suburb"));
  if (!suburb) return { error: "Pick the suburb from the list.", step: "studio" };
  const styles = list(formData, "styles").filter((s) => STYLES.has(s));
  if (styles.length === 0) return { error: "Pick at least one style you teach.", step: "studio" };

  if (await emailTaken(account.data.email)) {
    return {
      error: "There's already an account with that email. Log in instead, or use another email.",
      step: "account",
    };
  }

  const photo = await saveUploadedImage(formData.get("photo"));
  if (photo && !photo.ok) return { error: photo.error, step: "studio" };

  const passwordHash = await bcrypt.hash(account.data.password, 12);
  const s = studio.data;

  let user: { id: string; email: string; name: string };
  try {
    user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: account.data.name,
          email: account.data.email,
          phone: account.data.phone,
          passwordHash,
          role: "STUDIO_OWNER",
          timezone: DEFAULT_TIMEZONE,
          homeCity: "Sydney",
          avatarColor: pick(AVATAR_COLORS),
          acceptedTermsAt: new Date(),
          studio: {
            create: {
              name: s.studioName,
              abn: abnDigits(abn),
              // Stored with its suburb so every older page that prints the
              // address still reads naturally.
              address: `${s.address}, ${suburb.name}`,
              city: "Sydney",
              suburb: suburb.name,
              arrive: s.arrive || null,
              styles,
              description: s.about || `${styles.join(", ")} in ${suburb.name}.`,
              timezone: DEFAULT_TIMEZONE,
              photoId: photo?.id ?? null,
            },
          },
        },
        select: { id: true, email: true, name: true, studio: { select: { id: true } } },
      });
      await tx.studioMember.create({
        data: {
          studioId: created.studio!.id,
          userId: created.id,
          name: created.name,
          contact: created.email,
          role,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });
      return created;
    });
  } catch (err) {
    if (photo?.ok) await db.image.delete({ where: { id: photo.id } }).catch(() => {});
    logError("onboarding.createStudio", err);
    return { error: "We couldn't create the studio. Try again in a moment.", step: "studio" };
  }

  await sendVerification(user);
  return signInTo(account.data.email, account.data.password, "/studios/join/done");
}

// ─── Independent instructor sign-up (/teach) ─────────────────────────────────

export async function createInstructorAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  if (await getSessionUser()) {
    return { error: "You're already logged in. Log out to register a new teacher account.", step: "account" };
  }
  if (!(await underSignupLimit("teach-signup"))) {
    return { error: "Too many sign-ups from here. Try again in an hour.", step: "account" };
  }

  const account = parseAccount(formData, false);
  if ("error" in account) return { error: account.error!, step: "account" };
  const profile = parseProfile(formData);
  if ("error" in profile) return { error: profile.error!, step: "profile" };

  const draft = draftFromForm((k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  });
  // A new account has no payout account yet, so its first class is free.
  draft.price = "0";
  const problems = classProblems(draft, "independent");
  if (problems.length) return { error: `Still needed: ${problems.join(", ")}.`, step: "class" };

  if (await emailTaken(account.data.email)) {
    return {
      error: "There's already an account with that email. Log in instead, or use another email.",
      step: "account",
    };
  }

  const photo = await saveUploadedImage(formData.get("photo"));
  if (photo && !photo.ok) return { error: photo.error, step: "profile" };

  const passwordHash = await bcrypt.hash(account.data.password, 12);

  let result: { user: { id: string; email: string; name: string }; classId: string };
  try {
    result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: account.data.name,
          email: account.data.email,
          phone: account.data.phone,
          passwordHash,
          role: "INSTRUCTOR",
          timezone: DEFAULT_TIMEZONE,
          homeCity: "Sydney",
          bio: profile.data.bio || null,
          teacherNote: profile.data.note,
          teachStyles: profile.data.styles,
          yearsTeaching: profile.data.years || null,
          photoId: photo?.id ?? null,
          avatarColor: pick(AVATAR_COLORS),
          acceptedTermsAt: new Date(),
        },
        select: { id: true, email: true, name: true },
      });
      const made = await createFirstTimerClass(
        tx,
        draft,
        { kind: "independent", hostId: user.id, timezone: DEFAULT_TIMEZONE },
        0,
      );
      return { user, classId: made.firstId };
    });
  } catch (err) {
    if (photo?.ok) await db.image.delete({ where: { id: photo.id } }).catch(() => {});
    logError("onboarding.createInstructor", err);
    return { error: "We couldn't create your account. Try again in a moment.", step: "class" };
  }

  revalidatePath("/start");
  await sendVerification(result.user);
  return signInTo(
    account.data.email,
    account.data.password,
    `/teach/welcome?class=${encodeURIComponent(result.classId)}`,
  );
}

// ─── Joining a studio by invite (/join/:code) ────────────────────────────────

/** A new teacher account, made from an invite. */
export async function joinStudioAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  if (await getSessionUser()) {
    return { error: "You're already logged in. Log out first, or accept the invite as yourself.", step: "account" };
  }
  if (!(await underSignupLimit("join-signup"))) {
    return { error: "Too many sign-ups from here. Try again in an hour.", step: "account" };
  }

  const invite = await findInvite(text(formData, "code"));
  if (!invite.ok) return { error: inviteErrorMessage(invite), step: "account" };

  const account = parseAccount(formData, false);
  if ("error" in account) return { error: account.error!, step: "account" };
  const profile = parseProfile(formData);
  if ("error" in profile) return { error: profile.error!, step: "profile" };

  if (await emailTaken(account.data.email)) {
    return {
      error: "There's already an account with that email. Log in, then open your invite link again to accept it.",
      step: "account",
    };
  }

  const photo = await saveUploadedImage(formData.get("photo"));
  if (photo && !photo.ok) return { error: photo.error, step: "profile" };

  const passwordHash = await bcrypt.hash(account.data.password, 12);

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: account.data.name,
          email: account.data.email,
          phone: account.data.phone,
          passwordHash,
          role: "INSTRUCTOR",
          timezone: DEFAULT_TIMEZONE,
          homeCity: "Sydney",
          bio: profile.data.bio || null,
          teacherNote: profile.data.note,
          teachStyles: profile.data.styles,
          yearsTeaching: profile.data.years || null,
          photoId: photo?.id ?? null,
          avatarColor: pick(AVATAR_COLORS),
          acceptedTermsAt: new Date(),
        },
        select: { id: true, name: true },
      });
      await claimInvite(tx, invite.memberId, invite.code, user);
    });
  } catch (err) {
    if (photo?.ok) await db.image.delete({ where: { id: photo.id } }).catch(() => {});
    if (err instanceof InviteGone) {
      return { error: "That invite has just been used. Ask the studio for a new one.", step: "account" };
    }
    logError("onboarding.joinStudio", err);
    return { error: "We couldn't create your account. Try again in a moment.", step: "account" };
  }

  revalidatePath("/studio");
  const user = await db.user.findUniqueOrThrow({
    where: { email: account.data.email },
    select: { id: true, email: true, name: true },
  });
  await sendVerification(user);
  return signInTo(account.data.email, account.data.password, "/join/welcome");
}

export type AcceptState = { error: string } | undefined;

/** An existing teacher accepting an invite with the account they have. */
export async function acceptInviteAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const user = await getSessionUser();
  if (!user) return { error: "Log in first." };
  if (user.role !== "INSTRUCTOR") {
    return { error: "Invites are for teacher accounts. Log out and join with a new one." };
  }
  const invite = await findInvite(text(formData, "code"));
  if (!invite.ok) return { error: inviteErrorMessage(invite) };

  const already = await db.studioMember.findFirst({
    where: { studioId: invite.studioId, userId: user.id },
    select: { id: true },
  });
  if (already) return { error: `You're already on the ${invite.studio} team.` };

  try {
    await db.$transaction((tx) =>
      claimInvite(tx, invite.memberId, invite.code, { id: user.id, name: user.name ?? invite.name }),
    );
  } catch (err) {
    if (err instanceof InviteGone) return { error: "That invite has just been used." };
    throw err;
  }
  revalidatePath("/studio");
  revalidatePath("/teach");
  redirect("/join/welcome");
}

class InviteGone extends Error {}

/**
 * Turn an invite into a membership, once. The update only matches while the
 * code is still unused, so two people racing with the same code can't both
 * get in: the loser's transaction rolls back.
 */
async function claimInvite(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  memberId: string,
  code: string,
  user: { id: string; name: string },
) {
  const { count } = await tx.studioMember.updateMany({
    where: { id: memberId, status: "INVITED", inviteCode: code, inviteExpiresAt: { gt: new Date() } },
    data: {
      userId: user.id,
      name: user.name,
      status: "ACTIVE",
      joinedAt: new Date(),
      inviteCode: null,
      inviteExpiresAt: null,
    },
  });
  if (count !== 1) throw new InviteGone();
}
