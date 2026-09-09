import { MARK_COLORS } from "@/lib/avatar-marks";

/**
 * The colours a dancer can pick for their initials avatar.
 *
 * Authored in OKLCH to match the rest of the design system. `avatarColor` used
 * to be validated as a six-digit hex string, which silently rejected every one
 * of these, the save appeared to work and changed nothing. Validation now goes
 * through `isAvatarColor`, which accepts a palette entry or a legacy hex value
 * so accounts created before this still load.
 */
export const AVATAR_COLORS = [
  "oklch(66% 0.19 35)",
  "oklch(58% 0.13 55)",
  "oklch(58% 0.15 345)",
  "oklch(62% 0.11 85)",
  "oklch(40% 0.06 60)",
] as const;

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0];

const LEGACY_HEX = /^#[0-9a-fA-F]{6}$/;

export function isAvatarColor(value: string): boolean {
  return (
    (AVATAR_COLORS as readonly string[]).includes(value) ||
    // Instructors pick from the mark-disc palette instead.
    (MARK_COLORS as readonly string[]).includes(value) ||
    LEGACY_HEX.test(value)
  );
}
