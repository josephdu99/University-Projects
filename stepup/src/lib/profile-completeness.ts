/**
 * The profile completeness meter. A fuller profile ranks higher in search:
 * 80% unlocks Featured and 100% unlocks Elite.
 */

export type ProfileFacts = {
  bioLength: number;
  photos: number;
  styles: number;
  levelsMapped: number;
  hasVenue: boolean;
  termsPublished: boolean;
  payoutsConnected: boolean;
  classListed: boolean;
  approved: boolean;
};

export function profileChecklist(f: ProfileFacts): { label: string; done: boolean }[] {
  return [
    { label: "Bio written", done: f.bioLength > 40 },
    { label: "3 or more photos", done: f.photos >= 3 },
    { label: "Styles chosen", done: f.styles > 0 },
    { label: "Levels mapped to the StepUp scale", done: f.levelsMapped > 0 },
    { label: "Venue and door directions", done: f.hasVenue },
    { label: "Studio terms published", done: f.termsPublished },
    { label: "Payouts connected", done: f.payoutsConnected },
    { label: "A class listed", done: f.classListed },
    { label: "Profile approved", done: f.approved },
  ];
}

export function completeness(checks: { done: boolean }[]): number {
  if (checks.length === 0) return 0;
  return Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
}

export type Tier = "STANDARD" | "FEATURED" | "ELITE";

export function tierFor(pct: number): Tier {
  if (pct >= 100) return "ELITE";
  if (pct >= 80) return "FEATURED";
  return "STANDARD";
}

export const TIER_LABEL: Record<Tier, string> = {
  STANDARD: "Standard listing",
  FEATURED: "Featured",
  ELITE: "Elite",
};

/** How much a tier lifts a class among equally good matches. */
export function tierRank(t: Tier | null | undefined): number {
  return t === "ELITE" ? 2 : t === "FEATURED" ? 1 : 0;
}
