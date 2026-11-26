/**
 * What a sheet sync changes. One way only, sheet → StepUp: new rows and
 * changes to classes nobody has booked are applied straight away; a class
 * with bookings that changed or disappeared waits for the studio.
 *
 * Pure, so it can be tested without a database.
 */
import type { ReviewRow } from "@/lib/schedule-import";

/** The parts of a row a class is made from, as last applied. */
export type AppliedRow = Pick<
  ReviewRow,
  "title" | "style" | "level" | "day" | "time" | "dur" | "teacher" | "venue" | "room" | "price" | "setAside" | "repeat" | "kids" | "rowKey"
>;

export const APPLIED_FIELDS: (keyof AppliedRow)[] = [
  "title",
  "style",
  "level",
  "day",
  "time",
  "dur",
  "teacher",
  "venue",
  "room",
  "price",
  "setAside",
  "repeat",
  "kids",
];

export function appliedRow(r: ReviewRow | AppliedRow): AppliedRow {
  return {
    title: r.title,
    style: r.style,
    level: r.level,
    day: r.day,
    time: r.time,
    dur: r.dur,
    teacher: r.teacher,
    venue: r.venue,
    room: r.room,
    price: r.price,
    setAside: r.setAside,
    repeat: r.repeat,
    kids: r.kids,
    rowKey: r.rowKey,
  };
}

export type Imported = { seriesId: string; row: AppliedRow; booked: number };

export type ChangeKind = "schedule" | "venue" | "details";

export type SheetDiff = {
  /** New rows: classes to create. */
  added: ReviewRow[];
  /** Same class, new values. */
  changed: { seriesId: string; row: ReviewRow; fields: (keyof AppliedRow)[]; kind: ChangeKind; booked: number }[];
  /** In StepUp, gone from the sheet. */
  removed: Imported[];
};

const lower = (s: string) => String(s ?? "").trim().toLowerCase();
const indexOf = (key: string) => key.split(":")[0];

function changedFields(a: AppliedRow, b: AppliedRow): (keyof AppliedRow)[] {
  return APPLIED_FIELDS.filter((f) => String(a[f] ?? "") !== String(b[f] ?? ""));
}

export function kindOf(fields: (keyof AppliedRow)[]): ChangeKind {
  if (fields.some((f) => f === "day" || f === "time" || f === "dur" || f === "repeat")) return "schedule";
  if (fields.some((f) => f === "venue" || f === "room")) return "venue";
  return "details";
}

/**
 * Pair the sheet's rows with the classes imported from it. A row is the
 * same class when its key matches (same place, same title, day and time
 * as first imported); otherwise the same position and title; otherwise the
 * same title and day; otherwise the only class with that title.
 */
export function diffSheet(current: ReviewRow[], imported: Imported[]): SheetDiff {
  const left = new Map(imported.map((i) => [i.seriesId, i]));
  const pairs: { row: ReviewRow; prev: Imported }[] = [];
  const unpaired: ReviewRow[] = [];

  const take = (pred: (i: Imported) => boolean): Imported | null => {
    const hits = [...left.values()].filter(pred);
    if (hits.length !== 1) return null;
    left.delete(hits[0].seriesId);
    return hits[0];
  };

  const rows = [...current];
  const pending: ReviewRow[] = [];
  for (const r of rows) {
    const hit = take((i) => i.row.rowKey === r.rowKey);
    if (hit) pairs.push({ row: r, prev: hit });
    else pending.push(r);
  }
  for (const r of pending) {
    const hit =
      take((i) => indexOf(i.row.rowKey) === indexOf(r.rowKey) && lower(i.row.title) === lower(r.title)) ??
      take((i) => lower(i.row.title) === lower(r.title) && i.row.day === r.day) ??
      take((i) => lower(i.row.title) === lower(r.title));
    if (hit) pairs.push({ row: r, prev: hit });
    else unpaired.push(r);
  }

  const changed: SheetDiff["changed"] = [];
  for (const { row, prev } of pairs) {
    // The key stays the one it was first imported with.
    const now = { ...appliedRow(row), rowKey: prev.row.rowKey };
    const fields = changedFields(prev.row, now).filter((f) => f !== "rowKey");
    if (fields.length) changed.push({ seriesId: prev.seriesId, row: { ...row, rowKey: prev.row.rowKey }, fields, kind: kindOf(fields), booked: prev.booked });
  }
  return { added: unpaired, changed, removed: [...left.values()] };
}

/** "Thu 7:30pm" for a change line. */
export function whenLabel(r: Pick<AppliedRow, "day" | "time">): string {
  const [h, m] = (r.time || "00:00").split(":").map(Number);
  return `${r.day} ${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}
