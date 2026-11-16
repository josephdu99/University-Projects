import {
  addDaysToDateString,
  dateKeyInTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/time";

export type ReminderStage = "day-before" | "day-of";

/** The evening-before reminder goes out at 6pm, class-local. */
export const DAY_BEFORE_HOUR = "18:00";
/** The day-of reminder goes out at 9am, class-local, or earlier for a dawn class. */
export const DAY_OF_HOUR = "09:00";
/** A day-of reminder always leaves at least this long before the class. */
const DAY_OF_MIN_LEAD_MS = 2 * 60 * 60 * 1000;

/**
 * When each reminder for a class becomes due, as instants.
 *
 * Both are wall-clock times in the timezone the class happens in: 6pm the
 * evening before, and 9am on the day. A class too early for a 9am reminder
 * to be any use gets it two hours ahead instead, so a 7am class is reminded
 * at 5am rather than after it has finished.
 */
export function reminderTargets(
  startTime: Date,
  timezone: string,
): { dayBefore: Date; dayOf: Date } {
  const classDay = dateKeyInTimeZone(startTime, timezone);

  const dayBefore = zonedDateTimeToUtc(
    // The date before, counted on the calendar. "24 hours earlier" lands on
    // the wrong date on the day the clocks change.
    addDaysToDateString(classDay, -1),
    DAY_BEFORE_HOUR,
    timezone,
  );

  const nineOnTheDay = zonedDateTimeToUtc(classDay, DAY_OF_HOUR, timezone);
  const twoHoursAhead = new Date(startTime.getTime() - DAY_OF_MIN_LEAD_MS);
  const dayOf = nineOnTheDay < twoHoursAhead ? nineOnTheDay : twoHoursAhead;

  return { dayBefore, dayOf };
}

/**
 * Which reminder, if any, a booking is due right now.
 *
 * Each reminder has a time it becomes due, and is sent by the first run at
 * or after that time. The schedule lives in an external scheduler, outside
 * this repository, where nothing checks it, so the rule has to hold up
 * whatever that is set to. Called every hour or more often, each reminder
 * goes out once, within the interval after its time. Called less often,
 * reminders arrive late and some are missed (a once-a-day call at 7am never
 * lands between 6pm and a 7am class), but nothing is ever sent twice. An
 * earlier version sent on "the class is today",
 * which is only right for a job that runs exactly once a day, and mails
 * people at midnight the moment it is called more often.
 *
 * A reminder is only for somebody who booked before it was due. Booking at
 * 8pm for tomorrow, or at 10am for tonight, has just produced a
 * confirmation; a reminder minutes later would be noise.
 *
 * Pure, so it can be tested without a database.
 */
export function reminderStageFor(params: {
  startTime: Date;
  timezone: string;
  bookedAt: Date;
  now: Date;
}): ReminderStage | null {
  const { startTime, timezone, bookedAt, now } = params;

  // A class that has started cannot be reminded about.
  if (startTime.getTime() <= now.getTime()) return null;

  const { dayBefore, dayOf } = reminderTargets(startTime, timezone);

  // Once the day-of reminder is due, the evening-before one is not sent
  // late on top of it: one mail per run, and the more current one wins.
  if (now >= dayOf) return bookedAt < dayOf ? "day-of" : null;
  if (now >= dayBefore) return bookedAt < dayBefore ? "day-before" : null;
  return null;
}

/**
 * Is the class today or tomorrow, on the calendar of its own timezone?
 * The mail's wording is read off this rather than off which reminder is
 * going out, so "Tomorrow" is never said about a class that is today.
 */
export function classDayRelativeTo(
  startTime: Date,
  timezone: string,
  now: Date,
): "today" | "tomorrow" {
  return dateKeyInTimeZone(startTime, timezone) ===
    dateKeyInTimeZone(now, timezone)
    ? "today"
    : "tomorrow";
}
