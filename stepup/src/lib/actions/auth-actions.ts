"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";

const AVATAR_EMOJIS = ["🕺", "💃", "⚡", "🌟", "🔥", "🎀", "🌊", "🎤", "🩰", "🚀"];
const AVATAR_COLORS = [
  "#FC5200",
  "#7C5CFC",
  "#12B886",
  "#F59F00",
  "#E64980",
  "#1E90FF",
];

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STUDENT", "STUDIO_OWNER", "INSTRUCTOR"]),
  homeCity: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  studioName: z.string().trim().max(80).optional(),
  studioCity: z.string().trim().max(60).optional(),
  studioAddress: z.string().trim().max(120).optional(),
  studioDescription: z.string().trim().max(280).optional(),
});

export type FormState = { error?: string } | undefined;

export async function signUpAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const data = parsed.data;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  if (
    data.role === "STUDIO_OWNER" &&
    (!data.studioName || !data.studioCity || !data.studioAddress)
  ) {
    return { error: "Studio name, city and address are required." };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const avatarEmoji =
    AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  const avatarColor =
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      homeCity: data.homeCity || null,
      bio: data.bio || null,
      avatarEmoji,
      avatarColor,
    },
  });

  if (data.role === "STUDENT") {
    await db.gamificationProfile.create({ data: { userId: user.id } });
  }

  if (data.role === "STUDIO_OWNER") {
    await db.studio.create({
      data: {
        name: data.studioName!,
        city: data.studioCity!,
        address: data.studioAddress!,
        description: data.studioDescription || "A local dance studio.",
        ownerId: user.id,
      },
    });
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created — please log in." };
    }
    throw err;
  }
}

export async function loginAction(
  _prevState: FormState,
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
      return { error: "Invalid email or password." };
    }
    throw err;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
