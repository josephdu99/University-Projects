import { formatInTimeZone } from "date-fns-tz";
import { POLICIES, freeCancelUntil, type PolicyId } from "@/lib/policies";

/** "7:00am Thu 20 Nov", the exact moment free cancellation ends. */
export function cutoffLabel(start: Date, tz: string, policy: PolicyId): string {
  const at = freeCancelUntil(start, policy);
  return `${formatInTimeZone(at, tz, "h:mmaaa").toLowerCase()} ${formatInTimeZone(at, tz, "EEE d MMM")}`;
}

/**
 * The policy as students read it, with the exact cut-off: "Free cancellation
 * until 7:00am Thu 20 Nov (12 hours before class). After that, you get
 * credit, not a refund."
 */
export function cutoffSentence(start: Date, tz: string, policy: PolicyId): string {
  const p = POLICIES[policy];
  return `Free cancellation until ${cutoffLabel(start, tz, policy)} (${p.until} class). ${p.afterSentence}`;
}

/** For a course: free until the cut-off before the first class. */
export function courseCutoffSentence(firstStart: Date, tz: string, policy: PolicyId): string {
  const p = POLICIES[policy];
  return `Free cancellation until ${cutoffLabel(firstStart, tz, policy)} (${p.until} the first class). After that the course is yours: ${p.after}.`;
}
