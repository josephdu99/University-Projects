/**
 * How a studio lists a class on StepUp. StepUp is the way new students find a
 * studio, not a replacement for its own passes, so the studio picks how it
 * goes on.
 */
import { addDaysToDateString } from "@/lib/time";

/**
 * "HIDDEN" (not listed) can no longer be picked, but classes made before it
 * was taken out keep it, and stay off StepUp.
 */
export type Listing = "DROP_IN" | "TRIAL" | "COURSE" | "HIDDEN";
export type ListingChoice = Exclude<Listing, "HIDDEN">;

export const LISTINGS: { id: ListingChoice; label: string; how: string }[] = [
  { id: "DROP_IN", label: "Drop-in friendly", how: "Bookable as a single class. For most open-level classes." },
  { id: "TRIAL", label: "Trial / first class", how: "Free first visit, one per student. No commission." },
  { id: "COURSE", label: "Course enrolment", how: "Students book the whole term as one purchase." },
];

/** One of the listings a studio can pick for a new class. */
export function isListing(v: unknown): v is ListingChoice {
  return LISTINGS.some((l) => l.id === v);
}

export function listingLabel(v: string): string {
  if (v === "HIDDEN") return "Not listed";
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
