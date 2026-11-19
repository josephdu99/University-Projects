/**
 * NSW Working With Children Checks. Teachers of kids' classes need one,
 * verified before the class goes live. A number is WWC, seven digits, then E
 * (paid work) or V (volunteer). There's no public API for the check: the
 * studio looks it up on the Office of the Children's Guardian site, then
 * records here that it did, with the expiry date it saw.
 */

export function normaliseWwcc(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, "").toUpperCase();
}

export function isWwccNumber(v: string): boolean {
  return /^WWC\d{7}[EV]$/.test(normaliseWwcc(v));
}

export const WWCC_REMINDER_DAYS = 30;

export type WwccRecord = {
  wwccNumber: string | null;
  wwccExpiry: Date | null;
  wwccVerifiedAt: Date | null;
};

/** Verified and still in date: good to teach kids. */
export function wwccCurrent(m: WwccRecord, now: Date): boolean {
  return Boolean(
    m.wwccNumber && m.wwccVerifiedAt && m.wwccExpiry && m.wwccExpiry.getTime() > now.getTime(),
  );
}

/**
 * Is it time for the "expires in 30 days" reminder? Once per expiry date:
 * a reminder already sent inside this window isn't sent again, but a new
 * check with a new expiry gets its own.
 */
export function wwccReminderDue(
  m: WwccRecord & { wwccReminderAt: Date | null },
  now: Date,
): boolean {
  if (!m.wwccVerifiedAt || !m.wwccExpiry) return false;
  const windowStart = m.wwccExpiry.getTime() - WWCC_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  if (now.getTime() < windowStart || now.getTime() > m.wwccExpiry.getTime()) return false;
  return !m.wwccReminderAt || m.wwccReminderAt.getTime() < windowStart;
}
