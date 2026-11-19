import { formatInTimeZone } from "date-fns-tz";

export { dateBlockParts } from "@/lib/time";

/** "Tue 7:00pm", in the class's own zone. */
export function formatInTimeZoneShort(instant: Date, timeZone: string): string {
  return `${formatInTimeZone(instant, timeZone, "EEE")} ${formatInTimeZone(instant, timeZone, "h:mmaaa").toLowerCase()}`;
}

/** "Tue 18 Nov", in a zone. */
export function shortDay(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "EEE d MMM");
}

/** "18 Nov 2026", in a zone. */
export function shortDate(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "d MMM yyyy");
}

/** "6:12pm Tue 18 Nov", for message history. */
export function sentAt(instant: Date, timeZone: string): string {
  return `${formatInTimeZone(instant, timeZone, "h:mmaaa").toLowerCase()} ${formatInTimeZone(instant, timeZone, "EEE d MMM")}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}
