import { formatInTimeZone } from "date-fns-tz";
import { POLICIES, freeCancelUntil, type PolicyId } from "@/lib/policies";

/** "7:00am Thu 20 Nov", the exact moment free cancellation ends. */
export function cutoffLabel(start: Date, tz: string, policy: PolicyId): string {
  const at = freeCancelUntil(start, policy);
  return `${formatInTimeZone(at, tz, "h:mmaaa").toLowerCase()} ${formatInTimeZone(at, tz, "EEE d MMM")}`;
}

export function cutoffPassed(start: Date, policy: PolicyId, now = new Date()): boolean {
  return now.getTime() > freeCancelUntil(start, policy).getTime();
}

/**
 * The policy as students read it, with the exact cut-off: "Free cancellation
 * until 7:00am Thu 20 Nov (12 hours before class). After that, you get
 * credit, not a refund." Once the cut-off has passed it says so, and what
 * cancelling now gives back, rather than offering a time already gone.
 */
export function cutoffSentence(start: Date, tz: string, policy: PolicyId, now = new Date()): string {
  const p = POLICIES[policy];
  if (cutoffPassed(start, policy, now)) {
    return `Free cancellation closed at ${cutoffLabel(start, tz, policy)} (${p.until} class). If you cancel now: ${p.after}.`;
  }
  return `Free cancellation until ${cutoffLabel(start, tz, policy)} (${p.until} class). ${p.afterSentence}`;
}

/** One line for tight spots: the cut-off, or that it has passed. */
export function cutoffShort(start: Date, tz: string, policy: PolicyId, now = new Date()): string {
  return cutoffPassed(start, policy, now)
    ? `Free cancellation has closed: ${POLICIES[policy].after}.`
    : `Free cancellation until ${cutoffLabel(start, tz, policy)}.`;
}

/** For a course: free until the cut-off before the first class. */
export function courseCutoffSentence(firstStart: Date, tz: string, policy: PolicyId, now = new Date()): string {
  const p = POLICIES[policy];
  if (cutoffPassed(firstStart, policy, now)) {
    return `Free cancellation closed at ${cutoffLabel(firstStart, tz, policy)} (${p.until} the first class). If you cancel now: ${p.after}.`;
  }
  return `Free cancellation until ${cutoffLabel(firstStart, tz, policy)} (${p.until} the first class). After that the course is yours: ${p.after}.`;
}
