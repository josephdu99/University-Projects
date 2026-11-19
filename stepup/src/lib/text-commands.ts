/**
 * Running a class by text, from the teacher's own mobile:
 *
 *   cancel thu salsa
 *   msg thu salsa: we're in studio B
 *   move thu salsa to redfern hall
 *
 * StepUp replies to confirm before anything happens, and the teacher answers
 * YES. This file only reads the words; the inbound route checks who sent them
 * and what they're allowed to change.
 */

export type DayToken = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" | "today" | "tomorrow";

export type ParsedText =
  | { kind: "CONFIRM" }
  | { kind: "DECLINE" }
  | { kind: "CANCEL"; day: DayToken; words: string[] }
  | { kind: "MESSAGE"; day: DayToken; words: string[]; message: string }
  | { kind: "MOVE"; day: DayToken; words: string[]; venue: string }
  | { kind: "UNKNOWN" };

const DAY_WORDS: Record<string, DayToken> = {
  mon: "mon", monday: "mon",
  tue: "tue", tues: "tue", tuesday: "tue",
  wed: "wed", weds: "wed", wednesday: "wed",
  thu: "thu", thur: "thu", thurs: "thu", thursday: "thu",
  fri: "fri", friday: "fri",
  sat: "sat", saturday: "sat",
  sun: "sun", sunday: "sun",
  today: "today", tonight: "today", tomorrow: "tomorrow", tmrw: "tomorrow",
};

export function parseDay(word: string): DayToken | null {
  return DAY_WORDS[word.toLowerCase()] ?? null;
}

function splitWords(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function parseTextCommand(raw: string): ParsedText {
  const text = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (/^(yes|y|yep|confirm)[.!]?$/i.test(text)) return { kind: "CONFIRM" };
  if (/^(no|n|nope|cancel that)[.!]?$/i.test(text)) return { kind: "DECLINE" };

  let m = /^msg\s+(\S+)\s+([^:]+?)\s*:\s*([\s\S]+)$/i.exec(text);
  if (m) {
    const day = parseDay(m[1]);
    const words = splitWords(m[2]);
    const message = m[3].trim();
    if (day && words.length && message) return { kind: "MESSAGE", day, words, message: message.slice(0, 320) };
    return { kind: "UNKNOWN" };
  }
  m = /^move\s+(\S+)\s+(.+?)\s+to\s+(.+)$/i.exec(text);
  if (m) {
    const day = parseDay(m[1]);
    const words = splitWords(m[2]);
    const venue = m[3].trim();
    if (day && words.length && venue) return { kind: "MOVE", day, words, venue };
    return { kind: "UNKNOWN" };
  }
  m = /^cancel\s+(\S+)\s+(.+)$/i.exec(text);
  if (m) {
    const day = parseDay(m[1]);
    const words = splitWords(m[2]);
    if (day && words.length) return { kind: "CANCEL", day, words };
  }
  return { kind: "UNKNOWN" };
}

const DOW: Record<Exclude<DayToken, "today" | "tomorrow">, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * The class a text means: the soonest upcoming class on that day whose title
 * or style contains every word. `localDay` gives a class's weekday and date
 * in its own zone, so "thu" means Thursday where the class is.
 */
export function matchTextClass<T extends { title: string; style: string; startTime: Date }>(
  classes: T[],
  day: DayToken,
  words: string[],
  now: Date,
  localDay: (c: T) => { dow: number; dateKey: string },
  todayKey: string,
  tomorrowKey: string,
): T | null {
  const wanted = classes
    .filter((c) => c.startTime.getTime() > now.getTime() - 60 * 60 * 1000)
    .filter((c) => {
      const d = localDay(c);
      if (day === "today") return d.dateKey === todayKey;
      if (day === "tomorrow") return d.dateKey === tomorrowKey;
      return d.dow === DOW[day];
    })
    .filter((c) => {
      const hay = `${c.title} ${c.style}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  return wanted[0] ?? null;
}

/** "thu salsa", the short name a teacher would text for a class. */
export function textKeyFor(dow: number, style: string, title: string): string {
  const day = (Object.keys(DOW) as (keyof typeof DOW)[]).find((k) => DOW[k] === dow) ?? "mon";
  const word = (style || title).trim().split(/\s+/)[0]?.toLowerCase() ?? "class";
  return `${day} ${word}`;
}
