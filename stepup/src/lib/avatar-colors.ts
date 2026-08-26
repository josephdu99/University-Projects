/**
 * The dancer profile's avatar palette.
 *
 * Warm only, matching every other accent in the product. These are authored in
 * OKLCH like the rest of the design system, while older accounts still hold the
 * hex values the previous picker wrote — both are valid, see `isAvatarColor`.
 */
export const AVATAR_SWATCHES = [
  { value: "oklch(66% 0.19 35)", name: "Coral" },
  { value: "oklch(58% 0.13 55)", name: "Amber" },
  { value: "oklch(58% 0.15 345)", name: "Rose" },
  { value: "oklch(62% 0.11 85)", name: "Gold" },
  { value: "oklch(40% 0.06 60)", name: "Cocoa" },
] as const;

const SWATCH_VALUES: readonly string[] = AVATAR_SWATCHES.map((s) => s.value);

/** Accepts a palette swatch, or a hex colour from an older account. */
export function isAvatarColor(value: string): boolean {
  return SWATCH_VALUES.includes(value) || /^#[0-9a-fA-F]{6}$/.test(value);
}
