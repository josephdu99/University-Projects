/**
 * Instructor avatars are a line-art mark on a coloured disc rather than
 * initials or an emoji.
 *
 * An independent instructor is a one-person brand, and two letters or a
 * stock emoji says nothing about them. A mark they pick is something they
 * can be recognised by across their listings.
 *
 * The path data is authored on a 24x24 viewBox and stroked, never filled,
 * so a single set of coordinates works at every size the app renders.
 */
export type AvatarMark = { id: string; name: string; d: string };

export const AVATAR_MARKS: AvatarMark[] = [
  {
    id: "orbit",
    name: "Orbit",
    d: "M12 3.2a8.8 8.8 0 100 17.6 8.8 8.8 0 100-17.6M12 9a3 3 0 100 6 3 3 0 100-6",
  },
  {
    id: "ripple",
    name: "Ripple",
    d: "M12 20.5a8.5 8.5 0 010-17M12 20.5a4.6 4.6 0 010-9.2",
  },
  {
    id: "cadence",
    name: "Cadence",
    d: "M3.5 15c3 0 3.2-6 6.2-6s3.2 6 6.2 6 3.2-6 4.6-6",
  },
  {
    id: "terrace",
    name: "Terrace",
    d: "M4 18.5c0-4.4 3.6-8 8-8s8 3.6 8 8M8.4 18.5A3.6 3.6 0 0112 15a3.6 3.6 0 013.6 3.5",
  },
  {
    id: "rake",
    name: "Rake",
    d: "M4.5 19.5L19.5 4.5M4.5 12.2l7.3-7.3M12.2 19.5l7.3-7.3",
  },
  { id: "facet", name: "Facet", d: "M12 3.4l8.6 8.6-8.6 8.6L3.4 12z" },
  { id: "prism", name: "Prism", d: "M12 4l8 16H4zM8.4 20l3.6-7.4 3.6 7.4" },
  {
    id: "matrix",
    name: "Matrix",
    d: "M7.2 7.2h.01M12 7.2h.01M16.8 7.2h.01M7.2 12h.01M12 12h.01M16.8 12h.01M7.2 16.8h.01M12 16.8h.01M16.8 16.8h.01",
  },
];

export const DEFAULT_AVATAR_MARK = AVATAR_MARKS[1].id; // Ripple

/**
 * The disc the mark sits on. A wider range than the dancer palette: the
 * warm-only rule exists so style chips do not fight the coral accent, and
 * a single avatar disc is not competing with anything.
 */
export const MARK_COLORS = [
  "oklch(66% 0.19 35)",
  "oklch(58% 0.15 300)",
  "oklch(58% 0.12 165)",
  "oklch(62% 0.11 85)",
  "oklch(58% 0.15 345)",
  "oklch(55% 0.14 255)",
] as const;

export function findMark(id: string | null | undefined): AvatarMark | null {
  if (!id) return null;
  return AVATAR_MARKS.find((m) => m.id === id) ?? null;
}

export function isAvatarMark(value: string): boolean {
  return AVATAR_MARKS.some((m) => m.id === value);
}
