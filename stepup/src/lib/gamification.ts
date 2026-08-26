import { db } from "@/lib/db";
import {
  BADGE_BONUS_POINTS,
  BADGE_CATALOG,
  LEVELS,
  getLevelInfo,
  qualifyingBadges,
  nextStreak,
} from "@/lib/gamification-rules";

// Re-exported so callers keep importing gamification concepts from one place.
export {
  BADGE_BONUS_POINTS,
  BADGE_CATALOG,
  LEVELS,
  getLevelInfo,
  qualifyingBadges,
  nextStreak,
};

export type AwardedBadge = { name: string; emoji: string };

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function evaluateBadges(tx: Tx, userId: string): Promise<AwardedBadge[]> {
  const attended = await tx.booking.findMany({
    where: { userId, status: "ATTENDED" },
    include: { class: true },
  });

  const profile = await tx.gamificationProfile.findUniqueOrThrow({
    where: { userId },
  });

  const earned = qualifyingBadges(
    attended.map((b) => b.class),
    profile.currentStreak
  );

  if (earned.size === 0) return [];

  const owned = await tx.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { code: true } } },
  });
  const ownedCodes = new Set(owned.map((b) => b.badge.code));
  const newCodes = [...earned].filter((code) => !ownedCodes.has(code));
  if (newCodes.length === 0) return [];

  const badges = await tx.badge.findMany({ where: { code: { in: newCodes } } });

  // createMany + skipDuplicates so a concurrent award can't produce a
  // unique-constraint crash; count what actually landed to keep bonus points
  // in step with the rows written.
  const { count } = await tx.userBadge.createMany({
    data: badges.map((badge) => ({ userId, badgeId: badge.id })),
    skipDuplicates: true,
  });

  if (count > 0) {
    await tx.gamificationProfile.update({
      where: { userId },
      data: { totalPoints: { increment: count * BADGE_BONUS_POINTS } },
    });
  }

  return badges.map((b) => ({ name: b.name, emoji: b.emoji }));
}

export type AttendanceResult =
  | { ok: true; alreadyAttended: false; points: number; newBadges: AwardedBadge[] }
  | { ok: true; alreadyAttended: true; points: 0; newBadges: [] }
  | { ok: false; reason: string };

/**
 * Marks a booking attended, awards points, extends the weekly streak and
 * evaluates badges — all atomically.
 *
 * Concurrency: the status flip is a conditional `updateMany` guarded on
 * `status: "BOOKED"`. Only one caller can match that predicate, so a
 * double-submitted check-in awards points exactly once instead of twice.
 */
export async function recordAttendance(
  bookingId: string,
  at: Date = new Date()
): Promise<AttendanceResult> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { class: true, user: { select: { timezone: true } } },
    });

    if (!booking) return { ok: false, reason: "Booking not found." };
    if (booking.status === "ATTENDED") {
      return { ok: true, alreadyAttended: true, points: 0, newBadges: [] };
    }
    if (booking.status !== "BOOKED") {
      return { ok: false, reason: "This booking isn't active." };
    }
    if (booking.class.cancelledAt) {
      return { ok: false, reason: "This class was cancelled." };
    }

    const claimed = await tx.booking.updateMany({
      where: { id: bookingId, status: "BOOKED" },
      data: { status: "ATTENDED", attendedAt: at },
    });

    // Another concurrent request won the race and already awarded the points.
    if (claimed.count === 0) {
      return { ok: true, alreadyAttended: true, points: 0, newBadges: [] };
    }

    const profile = await tx.gamificationProfile.upsert({
      where: { userId: booking.userId },
      create: { userId: booking.userId },
      update: {},
    });

    // Streaks are counted in the dancer's own weeks, not UTC weeks.
    const currentStreak = nextStreak({
      lastAttendedAt: profile.lastAttendedAt,
      currentStreak: profile.currentStreak,
      now: at,
      timezone: booking.user.timezone,
    });
    const longestStreak = Math.max(profile.longestStreak, currentStreak);

    await tx.gamificationProfile.update({
      where: { userId: booking.userId },
      data: {
        totalPoints: { increment: booking.class.points },
        classesTaken: { increment: 1 },
        currentStreak,
        longestStreak,
        // Never move the marker backwards when back-filling historical data.
        lastAttendedAt:
          !profile.lastAttendedAt || at > profile.lastAttendedAt
            ? at
            : profile.lastAttendedAt,
      },
    });

    const newBadges = await evaluateBadges(tx, booking.userId);

    return {
      ok: true,
      alreadyAttended: false,
      points: booking.class.points,
      newBadges,
    };
  });
}

// The points-ranked leaderboard queries that used to live here are gone.
// /leaderboard now ranks dancers on classes they actually attended this month
// (src/lib/leaderboard.ts); points stay a private progress marker on the
// dancer's own profile rather than something they are publicly ordered by.
