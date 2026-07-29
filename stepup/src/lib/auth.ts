import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
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
          timezone: user.timezone,
          verified: user.emailVerifiedAt !== null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.avatarEmoji = user.avatarEmoji as string;
        token.avatarColor = user.avatarColor as string;
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
