import { db } from "@/lib/db";
import { recordAttendance } from "@/lib/gamification";
import { promoteNow } from "@/lib/booking";
import { noShowCount, notifyPromoted } from "@/lib/cancellation";
import { sendNoShowNotice } from "@/lib/email-studio";
import { NO_SHOW_PREPAY_AT, NO_SHOW_WARN_AT } from "@/lib/policies";
import { isDanceRole } from "@/lib/partner-roles";
import { logError } from "@/lib/logger";

/** Attendance can be marked from an hour before class (doors open). */
export const MARK_FROM_MINUTES = 60;

export type Mark = "ATTENDED" | "NO_SHOW" | null;

/**
 * One tap on the class list: attended, no-show, or back to booked. Attended
 * goes through the same points-and-streak path as a code check-in; a tap
 * taken back removes the class's points again. No-shows count towards the
 * studio's no-show rule, with one notice when a student reaches a warning or
 * the prepay rule.
 */
export async function setAttendance(bookingId: string, mark: Mark): Promise<{ ok: boolean; error?: string }> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true } },
      class: {
        select: {
          startTime: true,
          cancelledAt: true,
          points: true,
          hostId: true,
          studio: { select: { name: true } },
          host: { select: { name: true, displayName: true } },
        },
      },
    },
  });
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.class.cancelledAt) return { ok: false, error: "This class was cancelled." };
  if (b.class.startTime.getTime() - Date.now() > MARK_FROM_MINUTES * 60_000) {
    return { ok: false, error: "You can mark attendance from an hour before class." };
  }
  if (!["BOOKED", "ATTENDED", "NO_SHOW"].includes(b.status)) {
    return { ok: false, error: "Only confirmed bookings can be marked." };
  }

  if (b.status === "ATTENDED" && mark !== "ATTENDED") await undoAttendance(bookingId, b.userId, b.class.points);
  if (b.status === "NO_SHOW" && mark !== "NO_SHOW") {
    await db.booking.update({ where: { id: bookingId }, data: { status: "BOOKED", noShowAt: null } });
  }

  if (mark === "ATTENDED" && b.status !== "ATTENDED") {
    const result = await recordAttendance(bookingId);
    if (!result.ok) return { ok: false, error: result.reason };
  }

  if (mark === "NO_SHOW" && b.status !== "NO_SHOW") {
    await db.booking.update({ where: { id: bookingId }, data: { status: "NO_SHOW", noShowAt: new Date() } });
    const count = await noShowCount(b.userId, b.class.hostId);
    if (count >= NO_SHOW_WARN_AT && !b.noShowNoticeAt && b.user.email) {
      await db.booking.update({ where: { id: bookingId }, data: { noShowNoticeAt: new Date() } });
      await sendNoShowNotice({
        to: b.user.email,
        name: b.user.name,
        studioName: b.class.studio?.name ?? (b.class.host.displayName?.trim() || b.class.host.name),
        count,
        prepay: count >= NO_SHOW_PREPAY_AT,
      }).catch((err) => logError("email.noShowNotice", err));
    }
  }
  return { ok: true };
}

/**
 * Take back an attended mark: the booking goes back to booked and the class's
 * points and count come off the profile. The weekly streak is left as it is;
 * it can't be rebuilt exactly, and a mistaken tap rarely changes it.
 */
async function undoAttendance(bookingId: string, userId: string, points: number) {
  await db.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, status: "ATTENDED" },
      data: { status: "BOOKED", attendedAt: null },
    });
    if (count === 0) return;
    const profile = await tx.gamificationProfile.findUnique({ where: { userId } });
    if (!profile) return;
    await tx.gamificationProfile.update({
      where: { userId },
      data: {
        totalPoints: Math.max(0, profile.totalPoints - points),
        classesTaken: Math.max(0, profile.classesTaken - 1),
      },
    });
  });
}

/**
 * Someone at the door. They aren't a StepUp booking (no account, no payment,
 * no commission) but they're in the room, so they count towards leads and
 * follows, and a lead walking in can let a waiting follow in.
 */
export async function addWalkIn(classId: string, name: string, role: string | null) {
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false as const, error: "Add their name." };
  const walkIn = await db.walkIn.create({
    data: { classId, name: clean, role: isDanceRole(role) ? role : null },
  });
  const promoted = await promoteNow(classId);
  await notifyPromoted(promoted);
  return { ok: true as const, walkIn, promoted: promoted.length };
}
