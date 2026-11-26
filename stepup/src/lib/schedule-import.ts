/**
 * Schedule import (flow v6.6): one pipeline for a Google Sheet, pasted cells
 * or an image read by Claude.
 *
 *   source → rows → match to the studio's teachers, venues, styles and
 *   levels → an editable review row → (the studio says so) a class
 *
 * Pure and client-safe: the review table re-runs `matchRow` as the studio
 * edits the column mapping, and the server runs the same checks before it
 * creates anything.
 */
import { DANCE_STYLES, DAYS, type DayId, type RepeatId } from "@/lib/class-form";
import { LEVEL_SCALE, isScaleLevel, type ScaleLevel } from "@/lib/levels";
import type { MusicId } from "@/lib/first-class";

// ─── Columns ────────────────────────────────────────────────────────────────

export type ImportField = "title" | "style" | "level" | "day" | "start" | "end" | "teacher" | "venue" | "price" | "spots" | "repeats";

export const IMPORT_FIELDS: { id: ImportField; label: string }[] = [
  { id: "title", label: "Class" },
  { id: "style", label: "Style" },
  { id: "level", label: "Level" },
  { id: "day", label: "Day" },
  { id: "start", label: "Start time" },
  { id: "end", label: "End time" },
  { id: "teacher", label: "Teacher" },
  { id: "venue", label: "Venue or room" },
  { id: "price", label: "Price" },
  { id: "spots", label: "StepUp spots" },
  { id: "repeats", label: "Repeats" },
];

export const TEMPLATE_COLUMNS = ["Class", "Style", "Level", "Day", "Start", "End", "Teacher", "Venue", "Price", "Spots", "Repeats"];

const SYNONYMS: Record<ImportField, string[]> = {
  title: ["class", "class name", "name", "title", "course", "session"],
  style: ["style", "dance", "genre", "type"],
  level: ["level", "grade", "ability"],
  day: ["day", "weekday", "days"],
  start: ["start", "start time", "time", "from", "begins"],
  end: ["end", "end time", "finish", "finishes", "to", "until"],
  teacher: ["teacher", "instructor", "coach", "teacher name", "with"],
  venue: ["venue", "room", "studio", "location", "where"],
  price: ["price", "cost", "fee", "drop-in", "drop in", "$"],
  spots: ["spots", "capacity", "cap", "places", "max", "spaces"],
  repeats: ["repeats", "frequency", "recurrence", "repeat"],
};

/** Field → column index, as strings so a <select> can hold them. */
export type ColumnMapping = Partial<Record<ImportField, string>>;

/**
 * Match headers to fields by synonym: exact names first ("Instructor" →
 * Teacher), then a header that contains one ("Finish time" → End). Each
 * column is used once.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const m: ColumnMapping = {};
  const used = new Set<number>();
  const norm = headers.map((h) => h.trim().toLowerCase());
  for (const { id } of IMPORT_FIELDS) {
    const i = norm.findIndex((h, idx) => !used.has(idx) && SYNONYMS[id].includes(h));
    if (i >= 0) {
      m[id] = String(i);
      used.add(i);
    }
  }
  for (const { id } of IMPORT_FIELDS) {
    if (m[id] !== undefined) continue;
    const i = norm.findIndex((h, idx) => !used.has(idx) && SYNONYMS[id].some((s) => s.length > 2 && h.includes(s)));
    if (i >= 0) {
      m[id] = String(i);
      used.add(i);
    }
  }
  return m;
}

/** How many fields a mapping found: under 3 means the first row probably isn't a header. */
export function mappedCount(m: ColumnMapping): number {
  return Object.values(m).filter((v) => v !== undefined && v !== "").length;
}

// ─── Tables ─────────────────────────────────────────────────────────────────

/**
 * Cells from a spreadsheet: tab-separated (what a copy from Sheets or Excel
 * gives) or CSV with quotes, whichever the first line uses. Blank rows go.
 */
export function parseTable(text: string): string[][] {
  const t = String(text ?? "").replace(/\r\n?/g, "\n").replace(/^﻿/, "").trim();
  if (!t) return [];
  const delim = t.split("\n")[0].includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
    } else if (ch === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ""));
}

// ─── Values ─────────────────────────────────────────────────────────────────

/** "Tue", "Tuesday" or "tues" → "Tue". */
export function parseDay(v: string): DayId | "" {
  const s = String(v ?? "").trim().slice(0, 3).toLowerCase();
  return DAYS.find((d) => d.id.toLowerCase() === s)?.id ?? "";
}

/**
 * "7pm", "7:30 PM", "19:00" or "1930" → "19:30". A bare 1 to 7 is read as
 * pm: nobody runs a dance class at 7 in the morning without saying so.
 */
export function parseTime(v: string): string {
  const s = String(v ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/\.(?=\d{2})/, ":");
  if (!s) return "";
  const four = /^(\d{2})(\d{2})$/.exec(s);
  if (four) {
    const h = Number(four[1]);
    const m = Number(four[2]);
    return h > 23 || m > 59 ? "" : `${four[1]}:${four[2]}`;
  }
  const m = /^(\d{1,2})(?::(\d{2}))?(am|pm|a|p)?$/.exec(s);
  if (!m) return "";
  let h = Number(m[1]);
  const mi = Number(m[2] ?? 0);
  const ap = m[3]?.[0];
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 7) h += 12;
  return h > 23 || mi > 59 ? "" : `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

export function minutesBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

/** Round a length to the lengths a class can be: 45, 60, 75 or 90 minutes. */
export function snapLength(mins: number): string {
  const opts = [45, 60, 75, 90];
  return String(opts.reduce((best, o) => (Math.abs(o - mins) < Math.abs(best - mins) ? o : best), 60));
}

/** "$25" → "25"; "Free" or "Trial" → "0"; unreadable → "". */
export function parsePrice(v: string): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (/free|trial/.test(s)) return "0";
  const n = s.replace(/[^0-9.]/g, "");
  if (!n || Number.isNaN(Number(n))) return "";
  return String(Math.round(Number(n)));
}

export function parseRepeat(v: string): RepeatId {
  const s = String(v ?? "").trim().toLowerCase();
  if (/fortnight|2 ?week|every other|bi-?weekly/.test(s)) return "fortnightly";
  if (/once|one[- ]?off|single|workshop/.test(s)) return "once";
  return "weekly";
}

const KIDS = /\b(kids?|children|child|junior|juniors|teens?|tots|mini|minis|ages? \d)/i;

export function looksLikeKids(...texts: string[]): boolean {
  return texts.some((t) => KIDS.test(t ?? ""));
}

/** Music the matcher should pair a style with. */
export function musicForStyle(style: string): MusicId {
  const map: Record<string, MusicId> = {
    Salsa: "latin",
    Bachata: "latin",
    "Hip Hop": "hiphop",
    "K-pop": "hiphop",
    Heels: "hiphop",
    Ballet: "classical",
    Contemporary: "classical",
    Afrobeats: "afro",
  };
  return map[style] ?? "any";
}

// ─── Raw rows (before matching) ─────────────────────────────────────────────

/** A row as read, in the studio's own words, before matching. */
export type RawRow = {
  title: string;
  style: string;
  levelRaw: string;
  day: DayId | "";
  time: string;
  end: string;
  teacherRaw: string;
  venueRaw: string;
  price: string;
  spots: string;
  repeat: RepeatId;
  kids: boolean;
  /** Fields the reader wasn't sure of (always yellow). */
  uncertain: ReviewField[];
  /** Why, in the reader's words ("End time was cut off in the image"). */
  why: string;
  /** 0-based position in the source, for the stable row key. */
  index: number;
};

/** Rows from a table and a mapping. The first row is the header. */
export function rowsFromTable(table: string[][], mapping: ColumnMapping): RawRow[] {
  const get = (r: string[], f: ImportField) => {
    const c = mapping[f];
    return c !== undefined && c !== "" ? (r[Number(c)] ?? "").trim() : "";
  };
  return table
    .slice(1)
    .map((r, i): RawRow => {
      const title = get(r, "title");
      const levelRaw = get(r, "level");
      return {
        title,
        style: get(r, "style"),
        levelRaw,
        day: parseDay(get(r, "day")),
        time: parseTime(get(r, "start")),
        end: parseTime(get(r, "end")),
        teacherRaw: get(r, "teacher"),
        venueRaw: get(r, "venue"),
        price: parsePrice(get(r, "price")),
        spots: (get(r, "spots").match(/\d+/) ?? [""])[0],
        repeat: parseRepeat(get(r, "repeats")),
        kids: looksLikeKids(title, levelRaw),
        uncertain: [],
        why: "",
        index: i,
      };
    })
    .filter((r) => r.title || r.day || r.time);
}

// ─── Matching to the studio ─────────────────────────────────────────────────

export type ReviewField = "title" | "style" | "level" | "day" | "time" | "dur" | "teacher" | "venue" | "price" | "setAside";

/** Red if empty: a class can't be created without these. */
export const NEEDED: ReviewField[] = ["title", "style", "level", "day", "time", "teacher"];
const NEEDED_LABEL: Record<string, string> = {
  title: "class",
  style: "style",
  level: "level",
  day: "day",
  time: "start time",
  teacher: "teacher",
};

export type StudioContext = {
  styles: readonly string[];
  teachers: { id: string; name: string; wwccOk: boolean }[];
  venues: { id: string; name: string; address: string }[];
  levelNames: { name: string; scale: string }[];
  /** What's already on the timetable, to leave duplicates out. */
  existing: { title: string; day: DayId; time: string }[];
};

export type ReviewRow = {
  key: string;
  include: boolean;
  title: string;
  style: string;
  level: ScaleLevel | "";
  day: DayId | "";
  time: string;
  dur: string;
  teacher: string;
  /** "studio" or a saved venue's id. */
  venue: string;
  /** A room at the studio, when the sheet named one ("Studio B"). */
  room: string;
  price: string;
  setAside: string;
  repeat: RepeatId;
  kids: boolean;
  /** Yellow cells: guesses to check. */
  check: ReviewField[];
  notes: string[];
  dup: boolean;
  /** Finds the row again on the next sync. */
  rowKey: string;
  raw: { title: string; day: string; time: string; teacher: string; venue: string; level: string };
};

const lower = (s: string) => String(s ?? "").trim().toLowerCase();

/** A stable key for a row: its position plus a hash of what it first said. */
export function rowKeyFor(index: number, title: string, day: string, time: string): string {
  return `${index}:${shortHash(`${lower(title)}|${day}|${time}`)}`;
}

/** A small, stable, non-cryptographic hash (FNV-1a), fine for telling rows apart. */
export function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function matchTeacher(raw: string, teachers: StudioContext["teachers"]) {
  const r = lower(raw);
  if (!r) return null;
  return (
    teachers.find((t) => lower(t.name) === r) ??
    teachers.find((t) => lower(t.name).split(/\s+/)[0] === r.split(/\s+/)[0]) ??
    null
  );
}

export function matchVenue(raw: string, venues: StudioContext["venues"]) {
  const r = lower(raw);
  if (!r) return null;
  return venues.find((v) => lower(v.name) === r) ?? venues.find((v) => lower(v.name).includes(r) || r.includes(lower(v.name)) || lower(v.address).includes(r)) ?? null;
}

export function matchLevel(raw: string, levelNames: StudioContext["levelNames"]): ScaleLevel | "" {
  const r = lower(raw);
  if (!r) return "";
  const onScale = LEVEL_SCALE.find((l) => lower(l.label) === r || lower(l.id) === r.replace(/\s+/g, "_"));
  if (onScale) return onScale.id;
  const mapped = levelNames.find((l) => lower(l.name) === r);
  return mapped && isScaleLevel(mapped.scale) ? mapped.scale : "";
}

export function matchStyle(raw: string, title: string, styles: readonly string[]): string {
  const all = [...new Set([...styles, ...DANCE_STYLES])];
  // "Hip-hop", "hiphop" and "Hip Hop" are the same style.
  const flat = (x: string) => lower(x).replace(/[^a-z0-9]/g, "");
  const exact = all.find((s) => flat(s) === flat(raw));
  if (exact) return exact;
  const inText = all.find((s) => flat(title).includes(flat(s)) || (raw && flat(raw).includes(flat(s))));
  if (inText) return inText;
  // "Afro Taster" → Afrobeats: a word of four letters or more that starts a style.
  const words = `${raw} ${title}`.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length >= 4);
  return all.find((s) => words.some((w) => flat(s).startsWith(flat(w)))) ?? "";
}

export function missingFields(r: Pick<ReviewRow, ReviewField>): ReviewField[] {
  return NEEDED.filter((f) => !String(r[f] ?? "").trim());
}

export function missingLabel(fields: ReviewField[]): string {
  return fields.map((f) => NEEDED_LABEL[f] ?? f).join(", ");
}

/**
 * Match one raw row to the studio, and say what's missing, what was a
 * guess, and whether it's left out (already on the timetable, or a kids'
 * class whose teacher has no verified Working With Children Check).
 */
export function matchRow(raw: RawRow, ctx: StudioContext): ReviewRow {
  const teacher = matchTeacher(raw.teacherRaw, ctx.teachers);
  const venue = matchVenue(raw.venueRaw, ctx.venues);
  const level = matchLevel(raw.levelRaw, ctx.levelNames);
  const style = matchStyle(raw.style, raw.title, ctx.styles);
  const mins = minutesBetween(raw.time, raw.end);
  const check = new Set<ReviewField>(raw.uncertain);
  const notes: string[] = [];

  const dup = ctx.existing.some((k) => lower(k.title) === lower(raw.title) && k.day === raw.day && k.time === raw.time);
  if (dup) notes.push("Already on your timetable, so it’s left out.");
  if (raw.teacherRaw && !teacher) notes.push(`“${raw.teacherRaw}” isn’t on your team. Pick a teacher, or invite them on the Team tab.`);
  if (raw.levelRaw && !level) notes.push(`“${raw.levelRaw}” isn’t mapped to a StepUp level yet. Pick one, or map it in Profile.`);
  if (raw.time && mins <= 0) {
    check.add("dur");
    if (!raw.uncertain.includes("dur")) notes.push("No end time, so 1h is a guess.");
  }
  // A venue the studio hasn't saved is most likely one of its own rooms.
  let room = "";
  if (raw.venueRaw && !venue) {
    room = raw.venueRaw.slice(0, 40);
    check.add("venue");
    notes.push(`“${raw.venueRaw}” isn’t a saved venue, so it’s taken as a room at your studio. Pick a venue if it’s somewhere else.`);
  }
  if (raw.price === "" && raw.title) {
    check.add("price");
  }
  if (raw.why) notes.push(raw.why);
  const kidsBlocked = raw.kids && !(teacher?.wwccOk ?? false);
  if (raw.kids) {
    notes.push(
      kidsBlocked
        ? "Looks like a kids’ class. It needs a verified Working With Children Check for the teacher before it can go live, so it’s left out for now."
        : "Looks like a kids’ class. The teacher’s Working With Children Check is verified.",
    );
  }

  return {
    key: rowKeyFor(raw.index, raw.title, raw.day, raw.time),
    include: !dup && !kidsBlocked,
    title: raw.title.slice(0, 80),
    style,
    level,
    day: raw.day,
    time: raw.time,
    dur: mins > 0 ? snapLength(mins) : "60",
    teacher: teacher?.id ?? "",
    venue: venue?.id ?? "studio",
    room,
    price: raw.price,
    setAside: raw.spots || "6",
    repeat: raw.repeat,
    kids: raw.kids,
    check: [...check],
    notes,
    dup,
    rowKey: rowKeyFor(raw.index, raw.title, raw.day, raw.time),
    raw: { title: raw.title, day: raw.day, time: raw.time, teacher: raw.teacherRaw, venue: raw.venueRaw, level: raw.levelRaw },
  };
}

/** The review table's summary line. */
export function reviewSummary(rows: ReviewRow[]): string {
  const included = rows.filter((r) => r.include);
  const blocked = included.filter((r) => missingFields(r).length);
  return `${rows.length} ${rows.length === 1 ? "class" : "classes"} found · ${included.length} selected${
    blocked.length ? ` · ${blocked.length} need a few details` : ""
  }. Yellow cells were a guess; red cells are missing.`;
}

// ─── Sheets ─────────────────────────────────────────────────────────────────

/** Only Google Sheets "Publish to web" links. */
export function isSheetUrl(url: string): boolean {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/[^\s]+$/.test(String(url ?? "").trim());
}

/**
 * Turn a published sheet link into its CSV link. A "Publish to web" link
 * may say output=html or have no output at all; ask for CSV either way.
 */
export function csvUrlFor(url: string): string {
  const u = new URL(url.trim());
  if (/\/pub(html)?$/.test(u.pathname)) {
    u.pathname = u.pathname.replace(/\/pubhtml$/, "/pub");
    u.searchParams.set("output", "csv");
    return u.toString();
  }
  // A sheet shared with "anyone with the link" (not published) still has a
  // CSV export, for the tab in its #gid.
  const edit = /^\/spreadsheets\/d\/([\w-]+)\/(edit|view)?/.exec(u.pathname);
  if (edit && !u.pathname.includes("/export")) {
    const gid = /gid=(\d+)/.exec(u.hash + u.search)?.[1];
    return `https://docs.google.com/spreadsheets/d/${edit[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  }
  return u.toString();
}

/**
 * Hosts a published sheet may redirect to. Following any other redirect
 * would let a crafted link make our server fetch something it shouldn't.
 */
export function isAllowedSheetHost(host: string): boolean {
  return host === "docs.google.com" || /^[a-z0-9-]+\.googleusercontent\.com$/.test(host);
}

/**
 * Why a selected row can't be created yet, in the words the review table
 * shows: red cells, a paid class without payouts, a kids' class whose
 * teacher has no verified check, a class already on the timetable.
 */
export function rowBlockers(r: ReviewRow, ctx: Pick<StudioContext, "teachers"> & { canCharge: boolean }): string[] {
  const out: string[] = [];
  const missing = missingFields(r);
  if (missing.length) out.push(`Needed: ${missingLabel(missing)}.`);
  if (Number(r.price) > 0 && !ctx.canCharge) out.push("Set up payouts to charge for it, or make the price 0 (a free trial).");
  if (r.kids && !ctx.teachers.find((t) => t.id === r.teacher)?.wwccOk) out.push("A kids’ class needs the teacher’s Working With Children Check verified first.");
  if (r.dup) out.push("Already on your timetable.");
  const aside = Number(r.setAside);
  if (!Number.isInteger(aside) || aside < 1 || aside > 80) out.push("StepUp spots should be 1 to 80.");
  if (r.price !== "" && (!/^\d+$/.test(r.price) || Number(r.price) > 500)) out.push("Price should be whole dollars, up to $500.");
  return out;
}
