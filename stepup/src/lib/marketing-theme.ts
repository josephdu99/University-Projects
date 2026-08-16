import { Sora, Work_Sans } from "next/font/google";

/**
 * Typography and palette for the public marketing pages (landing + Get
 * Started). Scoped to those routes so the signed-in app keeps its own look.
 *
 * Values come from the design handoff and are authored in OKLCH.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const marketingFontClass = `${sora.variable} ${workSans.variable}`;

export const DISPLAY = "var(--font-display), sans-serif";
export const BODY = "var(--font-body), sans-serif";

export const C = {
  /** Warm off-white page background */
  bg: "oklch(97.5% 0.012 70)",
  /** Light-gray full-bleed band */
  bgAlt: "oklch(94% 0.015 70)",
  /** Card / surface white */
  card: "oklch(99% 0.005 70)",
  /** Primary text */
  ink: "oklch(22% 0.02 60)",
  /** Secondary text */
  inkSoft: "oklch(45% 0.02 60)",
  /** Body text on cards */
  inkBody: "oklch(30% 0.02 60)",
  border: "oklch(90% 0.01 70)",
  borderSoft: "oklch(88% 0.01 70)",
  borderInput: "oklch(85% 0.01 70)",
  /** Coral accent — primary CTA */
  brand: "oklch(66% 0.19 35)",
  brandHover: "oklch(58% 0.19 35)",
  onBrand: "oklch(99% 0.005 70)",
  /** Eyebrow tag */
  tagBg: "oklch(94% 0.05 85)",
  tagInk: "oklch(38% 0.09 70)",
  /** Amber highlight in the gamification band */
  gold: "oklch(78% 0.15 85)",
  /** Disabled control */
  disabledBg: "oklch(88% 0.01 70)",
  disabledInk: "oklch(60% 0.01 70)",
} as const;

export const CARD_SHADOW = "0 4px 24px oklch(0% 0 0 / 0.06)";
