/**
 * One level scale for the whole platform, so students can compare studios
 * fairly. Each studio maps its own level names onto it once ("Level 1" →
 * Absolute beginner).
 */

export type ScaleLevel = "ABSOLUTE_BEGINNER" | "BEGINNER" | "IMPROVER" | "INTERMEDIATE" | "ADVANCED";

export const LEVEL_SCALE: { id: ScaleLevel; label: string }[] = [
  { id: "ABSOLUTE_BEGINNER", label: "Absolute beginner" },
  { id: "BEGINNER", label: "Beginner" },
  { id: "IMPROVER", label: "Improver" },
  { id: "INTERMEDIATE", label: "Intermediate" },
  { id: "ADVANCED", label: "Advanced" },
];

export function isScaleLevel(v: unknown): v is ScaleLevel {
  return LEVEL_SCALE.some((l) => l.id === v);
}

export function scaleLabel(id: string): string {
  return LEVEL_SCALE.find((l) => l.id === id)?.label ?? (id === "ALL_LEVELS" ? "All levels" : id);
}

/** The levels a class page can call "First Timer". */
export const FIRST_TIMER_LEVELS: string[] = ["ABSOLUTE_BEGINNER", "BEGINNER"];

/** "Beginner (your Open level)", for the create-a-class picker. */
export function levelOptionLabel(id: ScaleLevel, mapped: { name: string; scale: string }[]): string {
  const names = mapped.filter((m) => m.scale === id).map((m) => m.name);
  const base = scaleLabel(id);
  return names.length ? `${base} (your ${names.join(", ")})` : base;
}
