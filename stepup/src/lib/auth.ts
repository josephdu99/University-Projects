import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@/lib/roles";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { logWarn } from "@/lib/logger";

/** Failed sign-ins allowed per email before a temporary lockout. */
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/**
 * "Continue with Google" only appears once credentials are configured. Without
 * this guard the button would render and then fail at the redirect, which is
 * worse than not offering it at all.
 */
export const GOOGLE_ENABLED = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

/**
 * Google sign-in creates a normal StepUp account on first use. Dancers are the
 * default — studios and instructors need details Google can't supply, so they
 * go through Get Started instead.
 *
 * `passwordHash` is required by the schema, so first-party accounts get random
 * bytes that no password can ever hash to. The account is reachable by password
 * only after its owner sets one through "Forgot password?".
 */
async function findOrCreateGoogleUser(email: string, name: string) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return existing;

  return db.user.create({
    data: {
      email,
      name,
      passwordHash: `google-only:${randomBytes(32).toString("hex")}`,
      role: "STUDENT",
      // Google has already proven the address, so there is nothing to verify.
      emailVerifiedAt: new Date(),
      acceptedTermsAt: new Date(),
      profile: { create: {} },
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    ...(GOOGLE_ENABLED ? [Google] : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) throw new LoginError("missing_credentials");

        // Throttle by email so guessing one account's password is slow.
        const limit = await checkRateLimit(
          `login:${email}`,
          MAX_LOGIN_ATTEMPTS,
          LOGIN_WINDOW_MS
        );
        if (!limit.allowed) {
          logWarn("auth.rateLimited", { email });
          throw new LoginError("too_many_attempts");
        }

        const user = await db.user.findUnique({ where: { email } });

        // Compare against a dummy hash when the account doesn't exist, so the
        // response time doesn't reveal which emails are registered.
        const hash =
          user?.passwordHash ??
          "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
        const valid = await bcrypt.compare(password, hash);

        if (!user || !valid) throw new LoginError("invalid_credentials");
        if (user.suspendedAt) throw new LoginError("account_suspended");

        await clearRateLimit(`login:${email}`);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          avatarEmoji: user.avatarEmoji,
          avatarColor: user.avatarColor,
          avatarMark: user.avatarMark,
          timezone: user.timezone,
          verified: user.emailVerifiedAt !== null,
        };
      },
    }),
  ],
  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "google") return true;

      // Signing in with Google adopts any existing account on the same
      // address, so an unverified Google address would be a way to take over
      // somebody's password account. Google sets this flag itself.
      if (profile?.email_verified !== true || !profile.email) {
        logWarn("auth.googleUnverifiedEmail", { email: profile?.email });
        return false;
      }

      const existing = await db.user.findUnique({
        where: { email: profile.email.toLowerCase() },
        select: { suspendedAt: true },
      });
      if (existing?.suspendedAt) return false;

      return true;
    },
    jwt: async ({ token, user, account, trigger }) => {
      // Google hands back a Google account id, not a StepUp one, so resolve
      // the real user record before anything downstream reads token.id.
      if (account?.provider === "google" && user?.email) {
        const record = await findOrCreateGoogleUser(
          user.email.toLowerCase(),
          user.name?.trim() || user.email.split("@")[0]
        );
        token.id = record.id;
        token.role = record.role as Role;
        token.name = record.name;
        token.avatarEmoji = record.avatarEmoji;
        token.avatarColor = record.avatarColor;
        token.avatarMark = record.avatarMark;
        token.timezone = record.timezone;
        token.verified = record.emailVerifiedAt !== null;
      } else if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.avatarEmoji = user.avatarEmoji as string;
        token.avatarColor = user.avatarColor as string;
        token.avatarMark = (user.avatarMark as string | null) ?? null;
        token.timezone = user.timezone as string;
        token.verified = user.verified as boolean;
      }

      // Refresh from the database when the client asks for an update (e.g.
      // after verifying an email or editing a profile), so the session stops
      // showing stale details.
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            name: true,
            avatarEmoji: true,
            avatarColor: true,
            avatarMark: true,
            timezone: true,
            emailVerifiedAt: true,
            suspendedAt: true,
          },
        });
        if (fresh) {
          token.role = fresh.role as Role;
          token.name = fresh.name;
          token.avatarEmoji = fresh.avatarEmoji;
          token.avatarColor = fresh.avatarColor;
          token.avatarMark = fresh.avatarMark;
          token.timezone = fresh.timezone;
          token.verified = fresh.emailVerifiedAt !== null;
          token.suspended = fresh.suspendedAt !== null;
        }
      }

      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.avatarEmoji = token.avatarEmoji as string;
      session.user.avatarMark = (token.avatarMark as string | null) ?? null;
      session.user.avatarColor = token.avatarColor as string;
      session.user.timezone = token.timezone as string;
      session.user.verified = Boolean(token.verified);
      return session;
    },
  },
});

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: "Enter your email and password.",
  invalid_credentials: "Invalid email or password.",
  too_many_attempts:
    "Too many failed attempts. Please wait a few minutes and try again.",
  account_suspended:
    "This account has been suspended. Contact support if you think that's a mistake.",
};
