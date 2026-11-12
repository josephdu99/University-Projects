import { addDaysToDateString, dateKeyInTimeZone } from "@/lib/time";

export type ReminderStage = "day-before" | "day-of";

/**
 * Which reminder, if any, a class is due on this run.
 *
 * Decided by the calendar, in the timezone the class happens in: a class
 * dated today gets the day-of reminder, a class dated tomorrow gets the
 * day-before one, anything else gets nothing yet.
 *
 * It used to be decided by hour offsets ("starts within 10 hours"), which
 * only works when the job runs every hour. Vercel's Hobby plan allows one
 * run a day, and with one run a day an offset rule sends most evening
 * classes a single mail and can land a "day before" mail two days early.
 * The calendar rule needs no particular cadence: whenever the daily run
 * happens, "today" and "tomorrow" mean what a person would mean by them.
 *
 * Pure, so it can be tested without a database.
 */
export function reminderStageFor(
  startTime: Date,
  timezone: string,
  now: Date,
): ReminderStage | null {
  // A class that has started cannot be reminded about.
  if (startTime.getTime() <= now.getTime()) return null;

  const classDay = dateKeyInTimeZone(startTime, timezone);
  const today = dateKeyInTimeZone(now, timezone);
  if (classDay === today) return "day-of";

  // Tomorrow is today's date plus one, not "24 hours from now": on the day
  // the clocks change, 24 hours from now can still be today, or already be
  // the day after tomorrow.
  if (classDay === addDaysToDateString(today, 1)) return "day-before";

  return null;
}
