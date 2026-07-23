import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    role: Role;
    avatarEmoji: string;
    avatarColor: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      avatarEmoji: string;
      avatarColor: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatarEmoji: string;
    avatarColor: string;
  }
}
