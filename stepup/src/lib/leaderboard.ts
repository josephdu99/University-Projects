/**
 * The monthly dancer leaderboard.
 *
 * Two rules shape everything here and both are promises the page's footer
 * makes out loud, so they have to be true in the code:
 *
 * 1. **Opt-in.** Only dancers who set `leaderboardOptIn` are listed. The
 *    viewer is the single exception — they always see their own row, marked
 *    "Only visible to you" when they are opted out.
 * 2. **Monthly reset.** Only attendance inside the current calendar month
 *    counts, so nobody accumulates an unreachable lead and a dancer who joins
 *    today is looking at a month, not a lifetime.
 *
 * Nothing here touches price, payments or points. Dancers are ranked on
 * classes they actually turned up to.
 */

export const METRICS = {
  classes: {
    label: "Classes danced",
    unit: "classes",
    subhead: "Ranked by classes danced this month. It resets on the first.",
  },
  styles: {
    label: "Styles explored",
    unit: "styles",
    subhead:
      "Ranked by how many different styles you have tried this month. It resets on the first.",
  },
} as const;

export type Metric = keyof typeof METRICS;

export const EVERYWHERE = "Everywhere";

export function isMetric(value: unknown): value is Metric {
  return typeof value === "string" && value in METRICS;
}

export type BoardRow = {
  userId: string;
  name: string;
  initials: string;
  /** Warm-family hue for the initials avatar. */
  hue: number;
  city: string | null;
  classes: number;
  styles: number;
  isViewer: boolean;
  /** Viewer's own row while opted out — shown to them and to nobody else. */
  privateToViewer: boolean;
};

export type RankedRow = BoardRow & {
  rank: number;
  value: number;
  /** The other metric, for the row's meta line. */
  secondary: number;
};

/**
 * Orders one board. Pure, so the server render and every client-side metric
 * switch produce byte-identical output.
 *
 * Ties share a rank (1, 2, 2, 4) — two dancers on nine classes are second
 * together, and neither is told they lost a tie-break. Display order inside a
 * tie is alphabetical, which is arbitrary but at least stable and not a
 * hidden ranking.
 */
export function rankBoard(
  rows: BoardRow[],
  metric: Metric,
  city: string
): RankedRow[] {
  const other: Metric = metric === "classes" ? "styles" : "classes";

  const ranked = rows
    .filter((r) => city === EVERYWHERE || r.city === city)
    .map((r) => ({ ...r, value: r[metric], secondary: r[other], rank: 0 }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  let lastValue: number | null = null;
  let lastRank = 0;
  for (const [i, row] of ranked.entries()) {
    row.rank = row.value === lastValue ? lastRank : i + 1;
    lastValue = row.value;
    lastRank = row.rank;
  }

  return ranked;
}

/**
 * The nearest dancer above the viewer, and how far off they are — the one
 * place on the page where a specific, achievable next step fits.
 *
 * Dancers level with the viewer are skipped rather than named — a tie gives
 * you nothing to aim at — so the line reaches past them to the first dancer
 * genuinely ahead. Null when nobody is.
 */
export function nextUpFrom(
  board: RankedRow[],
  viewerIndex: number
): { name: string; gap: number } | null {
  for (let i = viewerIndex - 1; i >= 0; i--) {
    const gap = board[i].value - board[viewerIndex].value;
    if (gap > 0) return { name: board[i].name.split(/\s+/)[0], gap };
  }
  return null;
}
