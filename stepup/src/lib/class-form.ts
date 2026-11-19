/**
 * The First Timer class form, shared by the studio dashboard and the
 * independent instructor's sign-up: its options, its defaults, and the one
 * list of what is still missing. The browser uses `classProblems` to say
 * "Still needed: …" as you type; the server runs the same function before it
 * writes anything, so the two can never disagree.
 */
import { findSuburb } from "@/lib/suburbs";
import { MUSIC, isMusic, type MusicId } from "@/lib/first-class";

/** The styles studios and teachers pick from, as in the design. */
export const DANCE_STYLES = [
  "Salsa",
  "Bachata",
  "Hip Hop",
  "Ballet",
  "Contemporary",
  "Afrobeats",
  "Jazz",
  "K-pop",
  "Heels",
  "Swing",
  "Ballroom",
  "Tap",
] as const;

export const MUSIC_OPTIONS: { id: MusicId; label: string }[] = MUSIC.map((m) => ({
  id: m.id,
  label: m.label,
}));

export type DayId = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

/** Days in the order the form shows them, with JavaScript's day numbers. */
export const DAYS: { id: DayId; dow: number; long: string }[] = [
  { id: "Mon", dow: 1, long: "Monday" },
  { id: "Tue", dow: 2, long: "Tuesday" },
  { id: "Wed", dow: 3, long: "Wednesday" },
  { id: "Thu", dow: 4, long: "Thursday" },
  { id: "Fri", dow: 5, long: "Friday" },
  { id: "Sat", dow: 6, long: "Saturday" },
  { id: "Sun", dow: 0, long: "Sunday" },
];

export function isDay(v: string): v is DayId {
  return DAYS.some((d) => d.id === v);
}

export type RepeatId = "weekly" | "fortnightly" | "once";

export const REPEATS: { id: RepeatId; label: string; short: string }[] = [
  { id: "weekly", label: "Every week", short: "Weekly" },
  { id: "fortnightly", label: "Every 2 weeks", short: "Fortnightly" },
  { id: "once", label: "One-off", short: "One-off" },
];

export function isRepeat(v: string): v is RepeatId {
  return REPEATS.some((r) => r.id === v);
}

/**
 * Repeating classes are scheduled this far ahead when they're published.
 * Nothing extends a timetable automatically yet, so the form says so.
 */
export const HORIZON_WEEKS = 12;

export type PartnerId = "SOLO" | "ROTATE" | "BRING";

export const PARTNER: { id: PartnerId; label: string; tag: string }[] = [
  { id: "SOLO", label: "Solo, no partner", tag: "No partner needed" },
  { id: "ROTATE", label: "Partners rotate", tag: "No partner needed · partners rotate" },
  { id: "BRING", label: "Bring a partner", tag: "Bring a partner" },
];

export function isPartner(v: string): v is PartnerId {
  return PARTNER.some((p) => p.id === v);
}

export function partnerTag(v: string | null | undefined): string | null {
  return PARTNER.find((p) => p.id === v)?.tag ?? null;
}

export const LENGTHS: { min: number; label: string }[] = [
  { min: 45, label: "45 min" },
  { min: 60, label: "1h" },
  { min: 75, label: "1h 15m" },
  { min: 90, label: "1h 30m" },
];

/** Promises in the studio's voice ("our teachers") and a teacher's own. */
export const STUDIO_PROMISES = [
  "Our teachers assume nobody in the room has danced before.",
  "Nobody needs to bring a partner, unless the class says so.",
  "Someone meets first-timers at the door and learns their names.",
] as const;

export const INSTRUCTOR_PROMISES = [
  "I assume nobody in the room has danced before.",
  "Nobody needs to bring a partner, unless the class says so.",
  "I’ll meet first-timers at the door and learn their names.",
] as const;

export type ClassDraft = {
  title: string;
  /** Studio classes only: a StudioMember id. */
  teacher: string;
  style: string;
  music: string;
  partner: PartnerId;
  day: DayId;
  time: string;
  dur: string;
  repeat: RepeatId;
  room: string;
  cap: string;
  newSpots: string;
  price: string;
  wear: string;
  plan: string;
  /** Independent classes only: where it happens. */
  suburb: string;
  address: string;
  arrive: string;
  promise: [boolean, boolean, boolean];
};

export const BLANK_CLASS: ClassDraft = {
  title: "",
  teacher: "",
  style: "",
  music: "",
  partner: "ROTATE",
  day: "Tue",
  time: "19:00",
  dur: "60",
  repeat: "weekly",
  room: "",
  cap: "16",
  newSpots: "6",
  price: "28",
  wear: "",
  plan: "",
  suburb: "",
  address: "",
  arrive: "",
  promise: [false, false, false],
};

export const LIMITS = {
  title: 80,
  room: 40,
  wear: 160,
  plan: 600,
  address: 160,
  arrive: 200,
} as const;

function wholeNumber(v: string): number | null {
  const t = String(v ?? "").trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

export function isClockTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v ?? ""));
}

/**
 * What is still missing or wrong, in the words "Still needed: …" reads well
 * with. Empty means the class can be published.
 */
export function classProblems(
  d: ClassDraft,
  mode: "studio" | "independent",
): string[] {
  const out: string[] = [];
  const title = d.title.trim();
  if (title.length < 3 || title.length > LIMITS.title) out.push("a class name");
  if (mode === "studio" && !d.teacher) out.push("a teacher");
  if (!d.style.trim()) out.push("a style");
  if (!isMusic(d.music)) out.push("the music");
  if (!isClockTime(d.time)) out.push("a start time");
  if (!LENGTHS.some((l) => String(l.min) === d.dur)) out.push("a length");

  const cap = wholeNumber(d.cap);
  if (cap === null || cap < 2 || cap > 80) out.push("a class size (2 to 80)");
  const spots = wholeNumber(d.newSpots);
  if (spots === null || spots < 1 || (cap !== null && spots > cap)) {
    out.push("first-timer spots (up to the class size)");
  }
  const price = wholeNumber(d.price);
  if (price === null || price > 500) out.push("a price in whole dollars");

  if (mode === "independent") {
    if (!findSuburb(d.suburb)) out.push("a suburb from the list");
    if (!d.address.trim()) out.push("the address");
  }
  if (d.room.length > LIMITS.room) out.push("a shorter room name");
  if (d.wear.length > LIMITS.wear) out.push("a shorter what-to-wear");
  if (d.plan.length > LIMITS.plan) out.push("a shorter run sheet");
  if (!d.promise.every(Boolean)) out.push("the First Timer promise");
  return out;
}

/** "19:00" → "7:00pm". */
export function formatClock(time: string): string {
  if (!isClockTime(time)) return "";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

export function lengthLabel(min: number | string): string {
  return LENGTHS.find((l) => String(l.min) === String(min))?.label ?? `${min} min`;
}

/**
 * Turn the browser's FormData (or any string record) back into a draft. The
 * promise boxes arrive as "on" when ticked.
 */
export function draftFromForm(get: (k: string) => string | null): ClassDraft {
  const s = (k: string) => get(k) ?? "";
  const day = s("day");
  const repeat = s("repeat");
  const partner = s("partner");
  return {
    title: s("title"),
    teacher: s("teacher"),
    style: s("style"),
    music: s("music"),
    partner: isPartner(partner) ? partner : "ROTATE",
    day: isDay(day) ? day : "Tue",
    time: s("time"),
    dur: s("dur"),
    repeat: isRepeat(repeat) ? repeat : "weekly",
    room: s("room"),
    cap: s("cap"),
    newSpots: s("newSpots"),
    price: s("price"),
    wear: s("wear"),
    plan: s("plan"),
    suburb: s("suburb"),
    address: s("address"),
    arrive: s("arrive"),
    promise: [get("promise0") === "on", get("promise1") === "on", get("promise2") === "on"],
  };
}
