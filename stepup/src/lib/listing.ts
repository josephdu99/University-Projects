/**
 * How a studio lists a class on StepUp. StepUp is the way new students find a
 * studio, not a replacement for its own passes, so the studio picks what goes
 * on and how.
 */
import { addDaysToDateString } from "@/lib/time";

export type Listing = "DROP_IN" | "TRIAL" | "COURSE" | "HIDDEN";

export const LISTINGS: { id: Listing; label: string; how: string }[] = [
  { id: "DROP_IN", label: "Drop-in friendly", how: "Bookable as a single class. For most open-level classes." },
  { id: "TRIAL", label: "Trial / first class", how: "Free first visit, one per student. No commission." },
  { id: "COURSE", label: "Course enrolment", how: "Students book the whole term as one purchase." },
  { id: "HIDDEN", label: "Not listed", how: "Stays off StepUp. For pass-holder-only classes." },
];

export function isListing(v: unknown): v is Listing {
  return LISTINGS.some((l) => l.id === v);
}

export function listingLabel(v: string): string {
  return LISTINGS.find((l) => l.id === v)?.label ?? "Drop-in friendly";
}

/** Can a student find and book it on StepUp at all? */
export function isPublicListing(v: string): boolean {
  return v !== "HIDDEN";
}

/**
 * The next term starts the week after this one's last class: a course of
 * `weeks` sessions from `termStart` ("yyyy-MM-dd") ends `weeks` weeks later.
 */
export function nextTermStart(termStart: string, weeks: number): string {
  return addDaysToDateString(termStart, weeks * 7);
}

export const MAX_COURSE_WEEKS = 20;
