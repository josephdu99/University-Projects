/**
 * Late cancellation presets and the no-show rule, from "Removing Studio Admin
 * Barriers". A studio picks a preset; StepUp shows it before booking and in
 * the confirmation, and applies it when someone cancels, so the teacher never
 * has to argue about it.
 *
 * Pure and client-safe: the class page, checkout and the cancel action all
 * read the same table.
 */

export type PolicyId = "RELAXED" | "STANDARD" | "STRICT";

export const POLICY_IDS: PolicyId[] = ["RELAXED", "STANDARD", "STRICT"];

export const POLICIES: Record<
  PolicyId,
  { label: string; hours: number; until: string; after: string; afterSentence: string }
> = {
  RELAXED: {
    label: "Relaxed",
    hours: 2,
    until: "2 hours before",
    after: "no refund",
    afterSentence: "After that, there's no refund.",
  },
  STANDARD: {
    label: "Standard",
    hours: 12,
    until: "12 hours before",
    after: "credit, no refund",
    afterSentence: "After that, you get credit, not a refund.",
  },
  STRICT: {
    label: "Strict",
    hours: 24,
    until: "24 hours before",
    after: "nothing back",
    afterSentence: "After that, there's nothing back.",
  },
};

export function isPolicy(v: unknown): v is PolicyId {
  return typeof v === "string" && (POLICY_IDS as string[]).includes(v);
}

/**
 * The preset a class runs under: its own override, else its studio's, else
 * Standard (independent teachers have no studio setting).
 */
export function effectivePolicy(
  classPolicy: string | null | undefined,
  studioPolicy: string | null | undefined,
): PolicyId {
  if (isPolicy(classPolicy)) return classPolicy;
  if (isPolicy(studioPolicy)) return studioPolicy;
  return "STANDARD";
}

/** The last moment someone can cancel and get everything back. */
export function freeCancelUntil(start: Date, policy: PolicyId): Date {
  return new Date(start.getTime() - POLICIES[policy].hours * 60 * 60 * 1000);
}

/** "Free cancellation until 12 hours before class. After that, …" */
export function policySentence(policy: PolicyId): string {
  const p = POLICIES[policy];
  return `Free cancellation until ${p.until} class. ${p.afterSentence}`;
}

/** Credit from a late cancellation lasts this long. */
export const CREDIT_VALID_DAYS = 183;

export type CancelOutcome =
  /** Everything back: a refund for a paid class. */
  | "FULL"
  /** Credit at the studio for what was paid, no refund. */
  | "CREDIT"
  /** Nothing back. */
  | "NONE";

/**
 * What a student gets when they cancel. Cancelling before the cut-off always
 * gives everything back, and so does a venue change since they booked
 * (they booked a different place). After the cut-off the preset decides,
 * except for someone on the prepay rule, who gets no late refund or credit.
 */
export function cancellationOutcome(params: {
  now: Date;
  start: Date;
  policy: PolicyId;
  prepayRequired: boolean;
  movedSinceBooking: boolean;
}): CancelOutcome {
  if (params.movedSinceBooking) return "FULL";
  if (params.now.getTime() <= freeCancelUntil(params.start, params.policy).getTime()) {
    return "FULL";
  }
  if (params.prepayRequired) return "NONE";
  return params.policy === "STANDARD" ? "CREDIT" : "NONE";
}

// ─── No-shows ────────────────────────────────────────────────────────────────

export const NO_SHOW_WINDOW_DAYS = 60;
/** Warned after this many no-shows in the window… */
export const NO_SHOW_WARN_AT = 2;
/** …and must prepay, with no late refund, at this many. */
export const NO_SHOW_PREPAY_AT = 3;

export const NO_SHOW_RULE =
  "Warned after 2 no-shows in 60 days. Prepay required after 3.";

export type NoShowStanding = "OK" | "WARNED" | "PREPAY";

export function noShowStanding(noShowsInWindow: number): NoShowStanding {
  if (noShowsInWindow >= NO_SHOW_PREPAY_AT) return "PREPAY";
  if (noShowsInWindow >= NO_SHOW_WARN_AT) return "WARNED";
  return "OK";
}

export type StudentStatus = "Prepay required" | "Warned" | "New" | "Regular";

/** The status column on the Dancers tab. */
export function studentStatus(classes: number, noShowsInWindow: number): StudentStatus {
  const standing = noShowStanding(noShowsInWindow);
  if (standing === "PREPAY") return "Prepay required";
  if (standing === "WARNED") return "Warned";
  return classes <= 1 ? "New" : "Regular";
}
