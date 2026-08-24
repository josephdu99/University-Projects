import { C } from "@/lib/marketing-theme";

/**
 * Dance styles map to a hue for their pill. The handoff is explicit that these
 * stay in the warm family — a cool chip reads as off-palette next to the coral
 * accent — so every hue here sits in 0–90 or 340–360, and anything unrecognised
 * gets a neutral chip rather than a guessed colour.
 */
const STYLE_HUES: Record<string, number> = {
  heels: 25,
  bachata: 15,
  "hip hop": 345,
  hiphop: 345,
  salsa: 55,
  jazz: 65,
  ballet: 70,
  contemporary: 40,
  afrobeats: 30,
  flow: 50,
  tango: 20,
  kizomba: 350,
  reggaeton: 35,
  "house": 60,
  breaking: 75,
  waacking: 340,
  dancehall: 45,
};

export function styleChipStyle(style: string): React.CSSProperties {
  const hue = STYLE_HUES[style.trim().toLowerCase()];

  const base: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 11px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  };

  if (hue === undefined) {
    return { ...base, background: "oklch(95% 0.008 70)", color: C.inkSoft };
  }
  return {
    ...base,
    background: `oklch(94% 0.05 ${hue})`,
    color: `oklch(42% 0.12 ${hue})`,
  };
}

/** Same warm-only rule, used to tint an initials avatar deterministically. */
export function avatarHue(seed: string): number {
  const WARM = [85, 45, 25, 60, 345, 35, 70];
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return WARM[sum % WARM.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
