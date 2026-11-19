import { zonedDateTimeToUtc, dateKeyInTimeZone } from "@/lib/time";

/**
 * Whether StepUp charges GST on its commission. It must register once its
 * turnover reaches $75,000; until then this stays off and statements say GST
 * $0.00. Set STEPUP_GST_REGISTERED=true and STEPUP_ABN when it registers.
 */
export function gstRegistered(): boolean {
  return process.env.STEPUP_GST_REGISTERED === "true";
}

export function stepupAbn(): string | null {
  return process.env.STEPUP_ABN?.trim() || null;
}

/** A month's bounds in a zone: [from, to). */
export function monthRange(year: number, month: number, tz: string) {
  const mm = String(month).padStart(2, "0");
  const nextY = month === 12 ? year + 1 : year;
  const nextM = String(month === 12 ? 1 : month + 1).padStart(2, "0");
  return {
    from: zonedDateTimeToUtc(`${year}-${mm}-01`, "00:00", tz),
    to: zonedDateTimeToUtc(`${nextY}-${nextM}-01`, "00:00", tz),
  };
}

/** This month as "yyyy-MM" in a zone. */
export function thisMonthKey(now: Date, tz: string) {
  return dateKeyInTimeZone(now, tz).slice(0, 7);
}

/** A "yyyy-MM-dd" range in a zone, inclusive of the last day: [from, to). */
export function dayRange(fromKey: string, toKey: string, tz: string) {
  const from = zonedDateTimeToUtc(fromKey, "00:00", tz);
  const end = zonedDateTimeToUtc(toKey, "00:00", tz);
  return { from, to: new Date(end.getTime() + 24 * 60 * 60_000) };
}
