/**
 * Pure gamification rules — levels, badges and streak arithmetic.
 *
 * Deliberately free of database imports so the scoring logic can be unit
 * tested without a connection, and so the rules stay easy to reason about in
 * one place.
 */
import { hourInTimeZone, isoWeeksBetween } from "@/lib/time";

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
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;

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
  { code: "FIRST_CLASS", name: "First Steps", description: "Attended your very first class", emoji: "🎉", sortOrder: 1 },
  { code: "FIVE_CLASSES", name: "Regular", description: "Attended 5 classes", emoji: "⭐", sortOrder: 2 },
  { code: "TWENTY_CLASSES", name: "Dedicated Dancer", description: "Attended 20 classes", emoji: "🏆", sortOrder: 3 },
  { code: "STREAK_3", name: "On a Roll", description: "3-week attendance streak", emoji: "🔥", sortOrder: 4 },
  { code: "STREAK_8", name: "Unstoppable", description: "8-week attendance streak", emoji: "🚀", sortOrder: 5 },
  { code: "STYLE_EXPLORER", name: "Style Explorer", description: "Tried 5 different dance styles", emoji: "🌈", sortOrder: 6 },
  { code: "SOCIAL_BUTTERFLY", name: "Social Butterfly", description: "Danced at 3 different studios", emoji: "🦋", sortOrder: 7 },
  { code: "ONLINE_PIONEER", name: "Online Pioneer", description: "Completed 5 online classes", emoji: "💻", sortOrder: 8 },
  { code: "NIGHT_OWL", name: "Night Owl", description: "Attended a class starting at 8pm or later", emoji: "🌙", sortOrder: 9 },
  { code: "EARLY_BIRD", name: "Early Bird", description: "Attended a class starting before 8am", emoji: "🐦", sortOrder: 10 },
] as const;

export type BadgeCode = (typeof BADGE_CATALOG)[number]["code"];

/** Minimal shape of an attended class needed to evaluate badges. */
export type AttendedClass = {
  style: string;
  studioId: string | null;
  format: string;
  startTime: Date;
  timezone: string;
};

/**
 * Works out which badges a dancer qualifies for.
 *
 * Time-of-day badges use each class's *local* wall-clock hour: a 7am Sydney
 * class is 21:00 UTC, so reading the server clock would award Night Owl to
 * early risers.
 */
export function qualifyingBadges(
  attended: AttendedClass[],
  currentStreak: number
): Set<BadgeCode> {
  const earned = new Set<BadgeCode>();

  const distinctStyles = new Set(attended.map((c) => c.style)).size;
  const distinctStudios = new Set(
    attended.map((c) => c.studioId).filter((id): id is string => Boolean(id))
  ).size;
  const onlineCount = attended.filter((c) => c.format === "ONLINE").length;

  if (attended.length >= 1) earned.add("FIRST_CLASS");
  if (attended.length >= 5) earned.add("FIVE_CLASSES");
  if (attended.length >= 20) earned.add("TWENTY_CLASSES");
  if (currentStreak >= 3) earned.add("STREAK_3");
  if (currentStreak >= 8) earned.add("STREAK_8");
  if (distinctStyles >= 5) earned.add("STYLE_EXPLORER");
  if (distinctStudios >= 3) earned.add("SOCIAL_BUTTERFLY");
  if (onlineCount >= 5) earned.add("ONLINE_PIONEER");
  if (attended.some((c) => hourInTimeZone(c.startTime, c.timezone) < 8)) {
    earned.add("EARLY_BIRD");
  }
  if (attended.some((c) => hourInTimeZone(c.startTime, c.timezone) >= 20)) {
    earned.add("NIGHT_OWL");
  }

  return earned;
}

/**
 * Next streak value given the previous attendance.
 *
 * Streaks are counted in the dancer's own ISO weeks: another class in the same
 * week doesn't extend it, the following week does, and a gap resets it.
 */
export function nextStreak(params: {
  lastAttendedAt: Date | null;
  currentStreak: number;
  now: Date;
  timezone: string;
}): number {
  const { lastAttendedAt, currentStreak, now, timezone } = params;
  if (!lastAttendedAt) return 1;

  const weekGap = isoWeeksBetween(lastAttendedAt, now, timezone);
  if (weekGap === 0) return currentStreak || 1;
  if (weekGap === 1) return currentStreak + 1;
  return 1;
}
