import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    role: Role;
    avatarEmoji: string;
    avatarColor: string;
    timezone: string;
    verified: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      avatarEmoji: string;
      avatarColor: string;
      timezone: string;
      verified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatarEmoji: string;
    avatarColor: string;
    timezone: string;
    verified: boolean;
    suspended?: boolean;
  }
}
