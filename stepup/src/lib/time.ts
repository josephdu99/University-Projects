import { format, isToday, isTomorrow } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Australia/Sydney";

/**
 * Common IANA zones offered in the UI. Anything else can still be stored —
 * this is only the picker's shortlist.
 */
export const COMMON_TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Hobart",
  "Pacific/Auckland",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a wall-clock date + time as entered in `timeZone` into the absolute
 * UTC instant it refers to.
 *
 * This is the crux of correct scheduling: a studio owner in Sydney typing
 * "6:00pm" means 6pm *in Sydney*, which is a different instant depending on
 * daylight saving. Parsing the string with `new Date()` would instead
 * interpret it in the server's zone (UTC on Vercel), shifting every class by
 * hours.
 */
export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string
): Date {
  return fromZonedTime(`${date}T${time}`, timeZone);
}

/** The wall-clock hour (0-23) an instant falls on in the given zone. */
export function hourInTimeZone(instant: Date, timeZone: string): number {
  return Number(formatInTimeZone(instant, timeZone, "H"));
}

/** ISO date ("yyyy-MM-dd") an instant falls on in the given zone. */
export function dateKeyInTimeZone(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

/** Short zone label for display, e.g. "AEDT". */
export function timeZoneAbbreviation(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "zzz");
}

/**
 * Human-friendly class time, rendered in `timeZone`.
 * e.g. "Today · 6:00pm", "Tomorrow · 9:30am", "Sat 25 Jul · 7:00pm"
 */
export function formatClassWhen(instant: Date, timeZone: string): string {
  const time = formatInTimeZone(instant, timeZone, "h:mmaaa").toLowerCase();
  const zoned = toZonedTime(instant, timeZone);

  if (isToday(zoned)) return `Today · ${time}`;
  if (isTomorrow(zoned)) return `Tomorrow · ${time}`;
  return `${formatInTimeZone(instant, timeZone, "EEE d MMM")} · ${time}`;
}

/** Full date + time + zone, for detail pages. */
export function formatClassWhenLong(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "EEEE d MMMM yyyy 'at' h:mmaaa (zzz)");
}

/** "yyyy-MM-dd" and "HH:mm" of an instant in a zone, for prefilling forms. */
export function toFormFields(instant: Date, timeZone: string) {
  return {
    date: formatInTimeZone(instant, timeZone, "yyyy-MM-dd"),
    time: formatInTimeZone(instant, timeZone, "HH:mm"),
  };
}

/**
 * Adds days to a plain "yyyy-MM-dd" date string without ever touching a
 * timezone. Doing this arithmetic on a Date risks shifting across a DST
 * boundary and landing on the wrong calendar day.
 */
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Day of week (0 = Sunday … 6 = Saturday) for an instant in a zone. */
export function dayOfWeekInTimeZone(instant: Date, timeZone: string): number {
  // date-fns "i" is ISO (1 = Monday … 7 = Sunday); normalise to 0 = Sunday.
  const iso = Number(formatInTimeZone(instant, timeZone, "i"));
  return iso % 7;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatMoney(cents: number, currency = "aud") {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * ISO week key ("2026-W30") for an instant in a zone. Streaks are counted in
 * the user's local weeks, not UTC weeks.
 */
export function isoWeekKeyInTimeZone(instant: Date, timeZone: string): string {
  const year = formatInTimeZone(instant, timeZone, "RRRR");
  const week = formatInTimeZone(instant, timeZone, "II");
  return `${year}-W${week}`;
}

/** Whole ISO weeks between two instants, measured in `timeZone`. */
export function isoWeeksBetween(
  earlier: Date,
  later: Date,
  timeZone: string
): number {
  const startOfIsoWeek = (instant: Date) => {
    const key = formatInTimeZone(instant, timeZone, "RRRR-II");
    const [y, w] = key.split("-").map(Number);
    // Thursday of ISO week 1 is always in the ISO year; anchor from there.
    const jan4 = fromZonedTime(`${y}-01-04T00:00:00`, timeZone);
    const jan4Dow = Number(formatInTimeZone(jan4, timeZone, "i")); // 1=Mon
    const week1Monday = new Date(jan4.getTime() - (jan4Dow - 1) * 86400000);
    return new Date(week1Monday.getTime() + (w - 1) * 7 * 86400000);
  };

  const a = startOfIsoWeek(earlier).getTime();
  const b = startOfIsoWeek(later).getTime();
  return Math.round((b - a) / (7 * 86400000));
}

export { format };
