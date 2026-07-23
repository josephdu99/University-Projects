import { differenceInCalendarISOWeeks } from "date-fns";
import { db } from "@/lib/db";

export const LEVELS = [
  { min: 0, name: "Newcomer" },
  { min: 100, name: "Mover" },
  { min: 250, name: "Groove Getter" },
  { min: 500, name: "Rhythm Rider" },
  { min: 900, name: "Floor Star" },
  { min: 1400, name: "Studio Regular" },
  { min: 2000, name: "Dance Machine" },
  { min: 2800, name: "Choreo Master" },
  { min: 3800, name: "Stage Legend" },
  { min: 5000, name: "StepUp Icon" },
] as const;

export function getLevelInfo(points: number) {
  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) levelIndex = i;
  }
  const current = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const progress = next
    ? (points - current.min) / (next.min - current.min)
    : 1;
  return {
    levelNumber: levelIndex + 1,
    name: current.name,
    points,
    nextThreshold: next?.min ?? null,
    nextName: next?.name ?? null,
    progress: Math.max(0, Math.min(1, progress)),
  };
}

export const BADGE_BONUS_POINTS = 25;

export const BADGE_CATALOG = [
  {
    code: "FIRST_CLASS",
    name: "First Steps",
    description: "Attended your very first class",
    emoji: "🎉",
    sortOrder: 1,
  },
  {
    code: "FIVE_CLASSES",
    name: "Regular",
    description: "Attended 5 classes",
    emoji: "⭐",
    sortOrder: 2,
  },
  {
    code: "TWENTY_CLASSES",
    name: "Dedicated Dancer",
    description: "Attended 20 classes",
    emoji: "🏆",
    sortOrder: 3,
  },
  {
    code: "STREAK_3",
    name: "On a Roll",
    description: "3-week attendance streak",
    emoji: "🔥",
    sortOrder: 4,
  },
  {
    code: "STREAK_8",
    name: "Unstoppable",
    description: "8-week attendance streak",
    emoji: "🚀",
    sortOrder: 5,
  },
  {
    code: "STYLE_EXPLORER",
    name: "Style Explorer",
    description: "Tried 5 different dance styles",
    emoji: "🌈",
    sortOrder: 6,
  },
  {
    code: "SOCIAL_BUTTERFLY",
    name: "Social Butterfly",
    description: "Danced at 3 different studios",
    emoji: "🦋",
    sortOrder: 7,
  },
  {
    code: "ONLINE_PIONEER",
    name: "Online Pioneer",
    description: "Completed 5 online classes",
    emoji: "💻",
    sortOrder: 8,
  },
  {
    code: "NIGHT_OWL",
    name: "Night Owl",
    description: "Attended a class starting at 8pm or later",
    emoji: "🌙",
    sortOrder: 9,
  },
  {
    code: "EARLY_BIRD",
    name: "Early Bird",
    description: "Attended a class starting before 8am",
    emoji: "🐦",
    sortOrder: 10,
  },
] as const;

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function evaluateBadges(tx: Tx, userId: string) {
  const attended = await tx.booking.findMany({
    where: { userId, status: "ATTENDED" },
    include: { class: true },
  });

  const profile = await tx.gamificationProfile.findUniqueOrThrow({
    where: { userId },
  });

  const distinctStyles = new Set(attended.map((b) => b.class.style)).size;
  const distinctStudios = new Set(
    attended.map((b) => b.class.studioId).filter(Boolean)
  ).size;
  const onlineCount = attended.filter(
    (b) => b.class.format === "ONLINE"
  ).length;
  const hasEarlyBird = attended.some(
    (b) => b.class.startTime.getHours() < 8
  );
  const hasNightOwl = attended.some(
    (b) => b.class.startTime.getHours() >= 20
  );

  const earned = new Set<string>();
  if (attended.length >= 1) earned.add("FIRST_CLASS");
  if (attended.length >= 5) earned.add("FIVE_CLASSES");
  if (attended.length >= 20) earned.add("TWENTY_CLASSES");
  if (profile.currentStreak >= 3) earned.add("STREAK_3");
  if (profile.currentStreak >= 8) earned.add("STREAK_8");
  if (distinctStyles >= 5) earned.add("STYLE_EXPLORER");
  if (distinctStudios >= 3) earned.add("SOCIAL_BUTTERFLY");
  if (onlineCount >= 5) earned.add("ONLINE_PIONEER");
  if (hasEarlyBird) earned.add("EARLY_BIRD");
  if (hasNightOwl) earned.add("NIGHT_OWL");

  if (earned.size === 0) return [];

  const alreadyOwned = await tx.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { code: true } } },
  });
  const ownedCodes = new Set(alreadyOwned.map((b) => b.badge.code));
  const newCodes = [...earned].filter((code) => !ownedCodes.has(code));
  if (newCodes.length === 0) return [];

  const badges = await tx.badge.findMany({ where: { code: { in: newCodes } } });

  for (const badge of badges) {
    await tx.userBadge.create({ data: { userId, badgeId: badge.id } });
  }

  if (badges.length > 0) {
    await tx.gamificationProfile.update({
      where: { userId },
      data: { totalPoints: { increment: badges.length * BADGE_BONUS_POINTS } },
    });
  }

  return badges;
}

/**
 * Marks a booking as attended, awards points, updates the weekly streak,
 * and evaluates/awards any newly-earned badges. Idempotent: calling it
 * again for an already-attended booking is a no-op.
 */
export async function recordAttendance(bookingId: string, at?: Date) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { class: true },
    });

    if (booking.status === "ATTENDED") {
      return { alreadyAttended: true, newBadges: [] as { name: string; emoji: string }[] };
    }

    const now = at ?? new Date();
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "ATTENDED", attendedAt: now },
    });

    const profile = await tx.gamificationProfile.upsert({
      where: { userId: booking.userId },
      create: { userId: booking.userId },
      update: {},
    });

    let currentStreak = 1;
    if (profile.lastAttendedAt) {
      const weekDiff = differenceInCalendarISOWeeks(now, profile.lastAttendedAt);
      if (weekDiff === 0) currentStreak = profile.currentStreak || 1;
      else if (weekDiff === 1) currentStreak = profile.currentStreak + 1;
      else currentStreak = 1;
    }
    const longestStreak = Math.max(profile.longestStreak, currentStreak);

    await tx.gamificationProfile.update({
      where: { userId: booking.userId },
      data: {
        totalPoints: { increment: booking.class.points },
        classesTaken: { increment: 1 },
        currentStreak,
        longestStreak,
        lastAttendedAt: now,
      },
    });

    const newBadges = await evaluateBadges(tx, booking.userId);

    return {
      alreadyAttended: false,
      newBadges: newBadges.map((b) => ({ name: b.name, emoji: b.emoji })),
    };
  });
}

export async function getGlobalLeaderboard(limit = 20) {
  return db.gamificationProfile.findMany({
    orderBy: { totalPoints: "desc" },
    take: limit,
    include: { user: { select: { id: true, name: true, avatarEmoji: true, avatarColor: true, homeCity: true } } },
  });
}

export async function getWeeklyLeaderboard(limit = 20) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const rows = await db.booking.findMany({
    where: { status: "ATTENDED", attendedAt: { gte: since } },
    include: {
      class: { select: { points: true } },
      user: { select: { id: true, name: true, avatarEmoji: true, avatarColor: true, homeCity: true } },
    },
  });

  const totals = new Map<
    string,
    { points: number; user: (typeof rows)[number]["user"] }
  >();
  for (const row of rows) {
    const entry = totals.get(row.userId) ?? { points: 0, user: row.user };
    entry.points += row.class.points;
    totals.set(row.userId, entry);
  }

  return [...totals.entries()]
    .map(([userId, v]) => ({ userId, points: v.points, user: v.user }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}
