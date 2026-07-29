import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_HOME, type Role } from "@/lib/roles";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

export async function requireAnyRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

/**
 * Gates actions that shouldn't happen on an unverified account (booking,
 * publishing classes, taking payments). Admins bypass the check.
 */
export async function requireVerified() {
  const user = await requireUser();
  if (!user.verified && user.role !== "ADMIN") redirect("/verify-email");
  return user;
}
