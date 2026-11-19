/**
 * Turning "Tuesdays at 7pm, every week" into dated sessions.
 *
 * Dates are worked out as calendar dates in the class's own zone and only
 * then turned into instants, so a weekly 7pm class stays at 7pm across a
 * daylight-saving change, the same rule the existing series code follows.
 */
import {
  addDaysToDateString,
  dateKeyInTimeZone,
  dayOfWeekInTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/time";
import { DAYS, HORIZON_WEEKS, type DayId, type RepeatId } from "@/lib/class-form";

/**
 * The first date the class happens on: the next `day` from now, in the
 * class's zone. Today counts if the start time is still ahead.
 */
export function firstSessionDate(
  now: Date,
  day: DayId,
  time: string,
  timeZone: string,
): string {
  const target = DAYS.find((d) => d.id === day)!.dow;
  const today = dateKeyInTimeZone(now, timeZone);
  const add = (target - dayOfWeekInTimeZone(now, timeZone) + 7) % 7;
  let date = addDaysToDateString(today, add);
  if (zonedDateTimeToUtc(date, time, timeZone).getTime() <= now.getTime()) {
    date = addDaysToDateString(date, 7);
  }
  return date;
}

/** Every date in the scheduling horizon, starting with `first`. */
export function sessionDates(first: string, repeat: RepeatId): string[] {
  if (repeat === "once") return [first];
  const step = repeat === "weekly" ? 7 : 14;
  const count = Math.ceil((HORIZON_WEEKS * 7) / step);
  return Array.from({ length: count }, (_, i) => addDaysToDateString(first, i * step));
}

export function sessionStarts(
  now: Date,
  day: DayId,
  time: string,
  repeat: RepeatId,
  timeZone: string,
): Date[] {
  const first = firstSessionDate(now, day, time, timeZone);
  return sessionDates(first, repeat).map((d) => zonedDateTimeToUtc(d, time, timeZone));
}
