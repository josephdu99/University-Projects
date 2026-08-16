/**
 * Copy shared by the public marketing pages.
 *
 * The design mockups shipped with example testimonials attributed to invented
 * dancers. Publishing those would be presenting fabricated reviews as genuine,
 * so this list starts empty and every surface that shows testimonials checks it
 * first. Add entries here once you have real quotes you have permission to use
 * — the landing page section and the login panel both light up automatically.
 */
export type Testimonial = {
  quote: string;
  name: string;
  /** e.g. "Dancer, 6-month streak" */
  role: string;
  initial: string;
  avatarBg: string;
};

export const TESTIMONIALS: Testimonial[] = [];

/**
 * Fallback lines for the login panel while there are no real testimonials.
 * These are claims about what the product does, not words put in a stranger's
 * mouth, so they are safe to ship on day one.
 */
export const LOGIN_ROTATING_LINES = [
  "One tap books your spot. No forms, no waiting on confirmation.",
  "Every class you attend earns points and pushes your level up.",
  "Miss a week and the streak resets — that's the whole trick.",
] as const;
