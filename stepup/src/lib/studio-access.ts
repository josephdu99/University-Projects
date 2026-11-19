import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { STUDIO_ADMIN_ROLES, type TeamRole } from "@/lib/team";

/**
 * Who may run a studio's dashboard.
 *
 * The account that signed the studio up always may; it hosts the studio's
 * classes, so payments land in its payout account. Anyone else needs an
 * active OWNER or MANAGER place on the team, given by an invite. Teachers
 * join a team too, but they teach the timetable rather than edit it.
 */
export async function getStudioAccess(userId: string) {
  const owned = await db.studio.findUnique({ where: { ownerId: userId } });
  if (owned) {
    const member = await db.studioMember.findFirst({
      where: { studioId: owned.id, userId },
    });
    return { studio: owned, member, isAccountHolder: true as const };
  }

  const membership = await db.studioMember.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      role: { in: STUDIO_ADMIN_ROLES },
      studio: { suspendedAt: null },
    },
    orderBy: { joinedAt: "asc" },
    include: { studio: true },
  });
  if (!membership) return null;
  const { studio, ...member } = membership;
  return { studio, member, isAccountHolder: false as const };
}

export type StudioAccess = NonNullable<Awaited<ReturnType<typeof getStudioAccess>>>;

/** For /studio pages: the studio this person runs, or off to their own home. */
export async function requireStudioAccess() {
  const user = await requireUser();
  const access = await getStudioAccess(user.id);
  if (!access) redirect(ROLE_HOME[user.role]);
  return { user, ...access };
}

/**
 * Can this person change this class: edit it, cancel it, run its check-in?
 * Its host can, and so can whoever runs the studio it belongs to.
 */
export async function canManageClass(
  user: { id: string; role: string },
  danceClass: { hostId: string; studioId: string | null },
): Promise<boolean> {
  if (user.role === "ADMIN" || danceClass.hostId === user.id) return true;
  if (!danceClass.studioId) return false;
  const member = await db.studioMember.findFirst({
    where: {
      studioId: danceClass.studioId,
      userId: user.id,
      status: "ACTIVE",
      role: { in: STUDIO_ADMIN_ROLES },
    },
    select: { id: true },
  });
  return member !== null;
}

/** The roles in a person's own words on the team list. */
export function memberRoleLine(role: string, teaches: boolean): string {
  const label = role === "OWNER" ? "Owner" : role === "MANAGER" ? "Manager" : "Teacher";
  return (role as TeamRole) === "TEACHER" || !teaches ? label : `${label} and teacher`;
}
