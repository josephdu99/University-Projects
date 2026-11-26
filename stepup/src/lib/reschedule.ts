/**
 * Rescheduling an upcoming class from the dashboard: a new date, start time
 * or length for one class, or for it and every later class in its series.
 *
 * Pure and client-safe, so the class sheet can say what will happen before
 * anything is saved, and so it can be tested without a database. The work of
 * saving and telling students is `rescheduleClass` in `studio-ops.ts`.
 */
import { isClockTime } from "@/lib/class-form";
import { addDaysToDateString, toFormFields, zonedDateTimeToUtc } from "@/lib/time";

export type RescheduleScope = "one" | "future";

export const MIN_LENGTH = 15;
export const MAX_LENGTH = 240;

/** Whole days from one "yyyy-MM-dd" to another. */
export function daysBetween(from: string, to: string): number {
  const at = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((at(to) - at(from)) / 86_400_000);
}

export type PlannedMove = { id: string; oldStart: Date; newStart: Date };

/**
 * Where each class goes. The class picked moves to `date` at `time`. Later
 * classes in the series, when they come too, move by the same number of days
 * and to the same time, worked out on the studio's own calendar so a
 * daylight-saving change in between doesn't shift anyone by an hour.
 */
export function planReschedule(p: {
  /** The class picked first, then any later ones coming with it. */
  sessions: { id: string; startTime: Date }[];
  timezone: string;
  date: string;
  time: string;
}): PlannedMove[] {
  const [picked] = p.sessions;
  if (!picked) return [];
  const shift = daysBetween(toFormFields(picked.startTime, p.timezone).date, p.date);
  return p.sessions.map((s) => ({
    id: s.id,
    oldStart: s.startTime,
    newStart: zonedDateTimeToUtc(addDaysToDateString(toFormFields(s.startTime, p.timezone).date, shift), p.time, p.timezone),
  }));
}

/**
 * What's wrong with a reschedule, in words for the studio, or null when it
 * can be saved. `others` are classes in the same series that aren't moving:
 * two classes from one series on the same day is almost always a slip.
 */
export function rescheduleProblem(p: {
  date: string;
  time: string;
  durationMin: number;
  timezone: string;
  now: Date;
  plan: PlannedMove[];
  others: Date[];
}): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "Pick a date.";
  if (!isClockTime(p.time)) return "Pick a start time.";
  if (!Number.isInteger(p.durationMin) || p.durationMin < MIN_LENGTH || p.durationMin > MAX_LENGTH) {
    return `Pick a length between ${MIN_LENGTH} minutes and ${MAX_LENGTH / 60} hours.`;
  }
  const first = p.plan[0];
  if (!first) return "Class not found.";
  if (first.newStart.getTime() <= p.now.getTime()) return "Pick a time that hasn't passed yet.";
  const busy = new Set(p.others.map((d) => toFormFields(d, p.timezone).date));
  const clash = p.plan.find((m) => busy.has(toFormFields(m.newStart, p.timezone).date));
  if (clash) return "That lands on the same day as another class in this series. Pick another day, or move them all.";
  return null;
}

/** Did anything a student would notice actually change? */
export function rescheduleChanges(p: {
  plan: PlannedMove[];
  current: { durationMin: number; venueId: string | null };
  durationMin: number;
  venueId: string | null;
}): { time: boolean; length: boolean; venue: boolean } {
  return {
    time: p.plan.some((m) => m.newStart.getTime() !== m.oldStart.getTime()),
    length: p.durationMin !== p.current.durationMin,
    venue: (p.venueId ?? null) !== (p.current.venueId ?? null),
  };
}
