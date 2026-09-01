import { dateKeyInTimeZone, addDaysToDateString } from "@/lib/time";

/**
 * The four states the "next class" hero moves through, derived from the real
 * start time rather than a query parameter.
 *
 *   now      — inside the last quarter hour before it starts, or under way
 *   today    — later the same day, in the dancer's own zone
 *   tomorrow — the next calendar day
 *   soon     — anything further out
 */
export type Phase = "soon" | "tomorrow" | "today" | "now";

const QUARTER_HOUR = 15 * 60_000;

export function phaseOf(
  start: Date,
  durationMin: number,
  now: Date,
  timeZone: string
): Phase {
  const untilStart = start.getTime() - now.getTime();
  const end = start.getTime() + durationMin * 60_000;
  if (untilStart <= QUARTER_HOUR && now.getTime() < end) return "now";

  const today = dateKeyInTimeZone(now, timeZone);
  const classDay = dateKeyInTimeZone(start, timeZone);
  if (classDay === today) return "today";
  if (classDay === addDaysToDateString(today, 1)) return "tomorrow";
  return "soon";
}

/** The uppercase chip: "STARTING NOW", "TODAY, IN 3 HOURS", "IN 4 DAYS". */
export function countdownLabel(
  phase: Phase,
  start: Date,
  now: Date,
  timeZone: string
): string {
  if (phase === "now") return "STARTING NOW";
  if (phase === "tomorrow") return "TOMORROW";

  if (phase === "today") {
    const minutes = Math.round((start.getTime() - now.getTime()) / 60_000);
    if (minutes < 60) return `TODAY, IN ${minutes} MIN`;
    const hours = Math.round(minutes / 60);
    return `TODAY, IN ${hours} ${hours === 1 ? "HOUR" : "HOURS"}`;
  }

  // Counted in whole calendar days in the dancer's zone, so a class late
  // tomorrow night is not described as being three days away.
  const days = daysBetweenKeys(
    dateKeyInTimeZone(now, timeZone),
    dateKeyInTimeZone(start, timeZone)
  );
  return `IN ${days} ${days === 1 ? "DAY" : "DAYS"}`;
}

function daysBetweenKeys(from: string, to: string) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000));
}

/**
 * A short note for a class already danced, but only where the attendance
 * record actually proves it — the first ever, the first of a style, the first
 * one online. The handoff's "You brought Priya" needs a referral feature that
 * does not exist, so nothing stands in for it.
 *
 * `past` must be ordered oldest first.
 */
export function attendedNotes(
  past: { id: string; style: string; format: string }[]
): Map<string, string> {
  const notes = new Map<string, string>();
  const seenStyles = new Set<string>();
  let seenOnline = false;

  past.forEach((item, i) => {
    if (i === 0) {
      notes.set(item.id, "Where it started");
      seenStyles.add(item.style);
      if (item.format === "ONLINE") seenOnline = true;
      return;
    }
    if (!seenStyles.has(item.style)) {
      seenStyles.add(item.style);
      notes.set(item.id, `First ${item.style.toLowerCase()} class`);
      if (item.format === "ONLINE") seenOnline = true;
      return;
    }
    if (item.format === "ONLINE" && !seenOnline) {
      seenOnline = true;
      notes.set(item.id, "First class online");
    }
  });

  return notes;
}

/** "6 classes, 3 styles, 2 studios since March 2026" */
export function attendedSummary(
  past: { style: string; studio: string | null }[],
  since: Date | null,
  timeZone: string
): string {
  if (past.length === 0) return "Nothing danced yet";

  const styles = new Set(past.map((p) => p.style)).size;
  const studios = new Set(past.flatMap((p) => (p.studio ? [p.studio] : []))).size;

  const parts = [
    plural(past.length, "class", "classes"),
    plural(styles, "style", "styles"),
  ];
  if (studios > 0) parts.push(plural(studios, "studio", "studios"));

  const when = since
    ? ` since ${new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone }).format(since)}`
    : "";

  return `${parts.join(", ")}${when}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
