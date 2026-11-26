/**
 * The first-timer funnel: three questions, and the beginner-friendly classes
 * that fit the answers, ranked live as they change.
 *
 * Pure and client-safe on purpose. The matcher re-ranks in the browser on
 * every answer, so this runs there; the query that feeds it lives in
 * `first-class-data.ts`, because importing `db` from here would drag Prisma
 * into the browser bundle.
 *
 * Everything here scores against fields a class really has: its style, its
 * level, the instant it starts and the zone it starts in, where it is, and
 * whether it is online. Nothing is scored against a field somebody would have
 * to invent first.
 */

import { findSuburb, type Suburb } from "@/lib/suburbs";

export type GoalId = "fun" | "fitness" | "meet" | "confidence" | "date";
export type MusicId = "latin" | "hiphop" | "classical" | "afro" | "any";
export type WhenId = "weekday" | "weekend" | "lunch";

export type Answers = {
  goals: GoalId[];
  /** Any number of tastes. A class that fits one of them matches. */
  music: MusicId[];
  /** Suburbs from `SUBURBS`, by name: home, work, wherever suits. */
  where: string[];
  when: WhenId[];
};

export const EMPTY_ANSWERS: Answers = {
  goals: [],
  music: [],
  where: [],
  when: [],
};

/** How many suburbs the "where" question takes. */
export const MAX_SUBURBS = 5;

type OneOrMany<T> = T | readonly T[] | null | undefined;
const many = <T,>(x: OneOrMany<T>): T[] => (x == null ? [] : Array.isArray(x) ? [...x] : [x as T]);

/** The suburbs actually picked, once each, in the order given. */
export function pickedSuburbs(where: OneOrMany<string>): Suburb[] {
  const out: Suburb[] = [];
  for (const w of many(where)) {
    const s = findSuburb(w);
    if (s && !out.some((o) => o.name === s.name)) out.push(s);
  }
  return out;
}

/** Where the matcher keeps its answers, as the handoff specifies. */
export const ANSWERS_STORAGE_KEY = "stepup-v6-match";

export const GOALS: { id: GoalId; label: string; hint: string }[] = [
  { id: "fun", label: "Fun", hint: "A night out that isn't a bar" },
  { id: "fitness", label: "Fitness", hint: "Cardio that doesn't feel like it" },
  { id: "meet", label: "Meet people", hint: "New faces, easy conversation" },
  { id: "confidence", label: "Confidence", hint: "Feel at home in your body" },
  { id: "date", label: "Date night", hint: "Something new to do together" },
];

const LATIN = ["salsa", "bachata", "reggaeton", "kizomba", "tango"];
const HIP_HOP = ["hip hop", "hiphop", "breaking", "waacking", "house", "heels"];
const CLASSICAL = ["ballet", "contemporary", "jazz", "flow"];
const AFRO = ["afrobeats", "dancehall"];

/**
 * Music taste maps onto the styles hosts actually file their classes under.
 * Matching is on the class's own `style` string, lowercased, so a style nobody
 * teaches simply never matches rather than quietly mis-filing a class.
 *
 * "Anything upbeat" means what it says: the Latin, hip hop and Afro styles,
 * not ballet. The handoff's prototype draws the same line.
 */
export const MUSIC: {
  id: MusicId;
  label: string;
  hint: string;
  styles: string[];
}[] = [
  { id: "latin", label: "Latin & pop", hint: "Salsa, reggaeton, bachata", styles: LATIN },
  { id: "hiphop", label: "Hip hop & R&B", hint: "Beats you can nod to", styles: HIP_HOP },
  { id: "classical", label: "Classical & soundtracks", hint: "Piano, strings, film scores", styles: CLASSICAL },
  { id: "afro", label: "Afrobeats & dancehall", hint: "Big rhythm, big energy", styles: AFRO },
  { id: "any", label: "Anything upbeat", hint: "Surprise me", styles: [...LATIN, ...HIP_HOP, ...AFRO] },
];

export const WHEN: { id: WhenId; label: string; hint: string }[] = [
  { id: "weekday", label: "Weekday evening", hint: "Mon to Fri, after 5pm" },
  { id: "weekend", label: "Weekend", hint: "Sat and Sun, any time" },
  { id: "lunch", label: "Weekday lunch", hint: "12 to 2pm, near work" },
];

export function isGoal(v: string): v is GoalId {
  return GOALS.some((g) => g.id === v);
}
export function isMusic(v: string): v is MusicId {
  return MUSIC.some((m) => m.id === v);
}
export function isWhen(v: string): v is WhenId {
  return WHEN.some((w) => w.id === v);
}

/** The music written for the middle of a sentence. */
const MUSIC_PHRASE: Record<MusicId, string> = {
  latin: "Latin & pop",
  hiphop: "hip hop & R&B",
  classical: "classical & soundtracks",
  afro: "Afrobeats & dancehall",
  any: "anything upbeat",
};

export function musicPhrase(id: MusicId): string {
  return MUSIC_PHRASE[id];
}

export function musicLabel(id: MusicId): string {
  return MUSIC.find((m) => m.id === id)?.label ?? "";
}
export function goalLabel(id: GoalId): string {
  return GOALS.find((g) => g.id === id)?.label ?? "";
}
export function whenLabel(id: WhenId): string {
  return WHEN.find((w) => w.id === id)?.label ?? "";
}

/**
 * How open a class is to somebody who has never danced.
 *
 * The handoff calls every result a "First Timer class", a designation the app
 * has no field for. `level` is the nearest real thing, so BEGINNER earns that
 * badge and ALL_LEVELS gets the weaker, true one. Anything pitched at
 * intermediate or advanced dancers is not shown in this funnel at all.
 */
export type Openness = "first-timer" | "all-levels";

export function opennessOf(level: string): Openness | null {
  if (level === "BEGINNER" || level === "ABSOLUTE_BEGINNER") return "first-timer";
  if (level === "ALL_LEVELS") return "all-levels";
  return null;
}

export const OPENNESS_LABEL: Record<Openness, string> = {
  "first-timer": "First Timer",
  "all-levels": "All levels, beginners welcome",
};

/** The shape the funnel needs from a class, whatever the query returns. */
export type CandidateClass = {
  id: string;
  title: string;
  style: string;
  level: string;
  format: string;
  location: string | null;
  startTime: Date;
  timezone: string;
  durationMin: number;
  capacity: number;
  priceCents: number;
  currency: string;
  seatsTaken: number;
  /** Bookings by people who have never attended a class here before. */
  firstTimersBooked: number;
  studioName: string | null;
  studioCity: string | null;
  /**
   * The Sydney suburb the class is in, read off its location or its studio's
   * address, or null when neither names one (online, or somewhere else).
   */
  suburb: string | null;
  hostName: string;
  /**
   * The music the host says the class is danced to, one of the matcher's own
   * ids. Classes listed before hosts were asked are null, and are matched on
   * their style instead.
   */
  music: string | null;
  /** The studio's own photo, when it uploaded one. */
  photoUrl: string | null;
  /**
   * How complete the studio's profile is, as a ranking tier: 0 standard,
   * 1 Featured, 2 Elite. Breaks ties between equally good matches.
   */
  tierRank?: number;
};

/**
 * Has this class already begun?
 *
 * A plain function rather than an inline `Date.now()` in a page body: the
 * clock is impure, and reading it during render is exactly what the purity
 * lint rule is there to catch.
 */
export function hasStarted(startTime: Date): boolean {
  return startTime.getTime() <= Date.now();
}

/** Local day of week (0 Sunday) and hour, in the class's own zone. */
export function localDayHour(
  startTime: Date,
  timezone: string,
): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(startTime);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  // "24" is how some engines spell midnight with hour12 off.
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday,
  );
  return { day: day < 0 ? 0 : day, hour };
}

/**
 * Which of the three time slots a class falls in, read in its own timezone,
 * or null for a time none of them covers, a weekday morning, say.
 */
export function slotOf(
  c: Pick<CandidateClass, "startTime" | "timezone">,
): WhenId | null {
  const { day, hour } = localDayHour(c.startTime, c.timezone);
  if (day === 0 || day === 6) return "weekend";
  if (hour >= 17) return "weekday";
  if (hour >= 12 && hour < 14) return "lunch";
  return null;
}

/** Does the class fall in any of these slots? No slots picked means yes. */
export function matchesWhen(
  c: Pick<CandidateClass, "startTime" | "timezone">,
  when: WhenId[],
): boolean {
  if (when.length === 0) return true;
  const slot = slotOf(c);
  return slot !== null && when.includes(slot);
}

/** Does the class fit any of the music picked? */
export function matchesMusic(
  c: { style: string; music?: string | null },
  music: OneOrMany<MusicId>,
): boolean {
  return many(music).some((m) => matchesOneMusic(c, m));
}

function matchesOneMusic(c: { style: string; music?: string | null }, music: MusicId): boolean {
  // What the host said beats what the style usually means: a contemporary
  // class danced to hip hop is a hip hop class to the person picking.
  if (c.music && isMusic(c.music)) {
    if (c.music === music) return true;
    if (music === "any") return c.music !== "classical";
    if (c.music === "any") return music !== "classical";
    return false;
  }
  const styles = MUSIC.find((m) => m.id === music)?.styles ?? [];
  return styles.includes(c.style.trim().toLowerCase());
}

/**
 * How close a class is to the nearest suburb picked: 1 in one of them, 0.5
 * in the same area as one, otherwise 0. Online classes are in no suburb, so
 * they score 0 here; they are never excluded for distance either.
 */
export function nearness(
  c: Pick<CandidateClass, "suburb">,
  where: OneOrMany<string>,
): number {
  return closest(c, where)?.score ?? 0;
}

function closest(c: Pick<CandidateClass, "suburb">, where: OneOrMany<string>): { score: number; picked: Suburb } | null {
  const at = findSuburb(c.suburb);
  if (!at) return null;
  let best: { score: number; picked: Suburb } | null = null;
  for (const picked of pickedSuburbs(where)) {
    const score = at.name === picked.name ? 1 : at.area === picked.area ? 0.5 : 0;
    if (score > (best?.score ?? 0)) best = { score, picked };
  }
  return best;
}

/**
 * Is this an in-person class we know is not in Sydney?
 *
 * Question 3 promises "We'll only show classes you can actually get to", and
 * every suburb on offer is a Sydney one. So once a suburb is picked, a class
 * at a Melbourne studio is taken out rather than ranked low. Only classes we
 * positively know to be elsewhere go: one whose address names no suburb but
 * whose studio is in Sydney stays in, unscored for distance.
 */
export function outOfReach(
  c: Pick<CandidateClass, "format" | "suburb" | "studioCity" | "timezone">,
  where: OneOrMany<string>,
): boolean {
  if (pickedSuburbs(where).length === 0) return false;
  if (c.format === "ONLINE" || c.suburb) return false;
  if (c.studioCity) return !/sydney/i.test(c.studioCity);
  return c.timezone !== "Australia/Sydney";
}

/**
 * The three questions' state, in order: has each been answered?
 *
 * The third counts only once at least one suburb has actually been picked
 * from the list (an exact match counts) and at least one time slot is on, as
 * the handoff specifies. Typing half a suburb name is not an answer.
 */
export function questionsDone(a: Answers): [boolean, boolean, boolean] {
  return [
    a.goals.length > 0,
    a.music.length > 0,
    pickedSuburbs(a.where).length > 0 && a.when.length > 0,
  ];
}

export type Scored = {
  score: number;
  openness: Openness;
  /** Why this one came up, in the dancer's own terms. All of it checkable. */
  reasons: string[];
};

/** A candidate with its score; extra fields the caller added ride along. */
export type ScoredClass<T extends CandidateClass = CandidateClass> = T & Scored;

const SLOT_REASON: Record<WhenId, string> = {
  weekday: "On a weekday evening, after work.",
  weekend: "On the weekend.",
  lunch: "At lunchtime on a weekday.",
};

/**
 * Rank the candidates, with the handoff's scoring: +2 when the music matches
 * any you picked, +1 when the class is in a time slot you picked, and +1 when
 * it is in one of your suburbs or +0.5 when it is in the same area as one. Ties go to a First Timer class
 * over an all-levels one, then to the sooner class.
 *
 * Every reason names the fact that earned it, so a dancer can check the claim
 * against the class page rather than taking it on faith. Goals do not move
 * the ranking, as in the handoff; they only add reasons, and only true ones.
 */
export function rankClasses<T extends CandidateClass>(
  classes: T[],
  answers: Answers,
): ScoredClass<T>[] {
  const picked = pickedSuburbs(answers.where);

  const scored = classes.flatMap((c) => {
    const openness = opennessOf(c.level);
    if (!openness) return [];
    if (outOfReach(c, answers.where)) return [];

    const reasons: string[] = [];
    let score = 0;

    // The music picked that this class fits, the host's own word first.
    const declared = c.music && isMusic(c.music) ? c.music : null;
    const fit = declared && answers.music.includes(declared) ? declared : answers.music.find((m) => matchesOneMusic(c, m));
    if (fit) {
      score += 2;
      reasons.push(
        declared && declared !== "any"
          ? `It's danced to ${musicPhrase(declared)}${fit === declared ? ", which you picked" : ", which is upbeat"}.`
          : fit === "any"
            ? `${c.style} is upbeat, which is what you asked for.`
            : declared === "any"
              ? `It's danced to anything upbeat, ${musicPhrase(fit)} included.`
              : `${c.style} sits in the ${musicLabel(fit)} you picked.`,
      );
    }

    const slot = slotOf(c);
    if (slot && answers.when.includes(slot)) {
      score += 1;
      reasons.push(SLOT_REASON[slot]);
    }

    if (picked.length) {
      const near = closest(c, answers.where);
      score += near?.score ?? 0;
      if (near?.score === 1) {
        reasons.push(`In ${near.picked.name}, where you said.`);
      } else if (near?.score === 0.5) {
        reasons.push(`In ${c.suburb}, the same part of Sydney as ${near.picked.name}.`);
      } else if (c.format === "ONLINE") {
        reasons.push("Online, so where you live doesn't matter.");
      }
    }

    const seatsLeft = c.capacity - c.seatsTaken;
    if (answers.goals.includes("meet") && c.format === "IN_PERSON") {
      reasons.push("In a room with other people, not over video.");
    }
    if (answers.goals.includes("confidence") && c.firstTimersBooked > 0) {
      reasons.push(
        c.firstTimersBooked === 1
          ? "Somebody else booked in has never danced here either."
          : `${c.firstTimersBooked} others booked in have never danced here either.`,
      );
    }
    if (answers.goals.includes("date") && seatsLeft >= 2) {
      reasons.push("At least two seats left, so you can book for two.");
    }
    if (answers.goals.includes("fitness") && c.durationMin >= 60) {
      reasons.push(`${c.durationMin} minutes of moving.`);
    }

    reasons.push(
      openness === "first-timer"
        ? "Pitched at people who have never danced before."
        : "Open to all levels, so beginners are expected.",
    );

    return [{ ...c, score, openness, reasons } as ScoredClass<T>];
  });

  const firstTimerFirst = (o: Openness) => (o === "first-timer" ? 0 : 1);
  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.tierRank ?? 0) - (a.tierRank ?? 0) ||
      firstTimerFirst(a.openness) - firstTimerFirst(b.openness) ||
      a.startTime.getTime() - b.startTime.getTime() ||
      a.title.localeCompare(b.title),
  );
}

/** The chips the results show back, so the answers stay visible. */
export function answerChips(a: Answers): string[] {
  return [
    ...a.goals.map(goalLabel),
    ...a.music.map(musicLabel),
    ...pickedSuburbs(a.where).map((s) => s.name),
    ...a.when.map(whenLabel),
  ].filter(Boolean);
}

/** Round-trips the answers through a URL, so older links still land. */
export function answersToParams(a: Answers): URLSearchParams {
  const p = new URLSearchParams();
  if (a.goals.length) p.set("goals", a.goals.join(","));
  if (a.music.length) p.set("music", a.music.join(","));
  const where = pickedSuburbs(a.where);
  if (where.length) p.set("where", where.map((s) => s.name).join(","));
  if (a.when.length) p.set("when", a.when.join(","));
  return p;
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function answersFromParams(p: {
  goals?: string;
  music?: string;
  where?: string;
  when?: string;
}): Answers {
  return {
    goals: unique((p.goals ?? "").split(",").filter(isGoal)),
    music: unique((p.music ?? "").split(",").filter(isMusic)),
    where: pickedSuburbs((p.where ?? "").split(",")).slice(0, MAX_SUBURBS).map((s) => s.name),
    when: unique((p.when ?? "").split(",").filter(isWhen)),
  };
}

/**
 * Answers read back from localStorage. Anything in there was written by this
 * page, but it is still outside data: an old shape, a hand edit, another
 * version of the app. Whatever does not check out is dropped, not trusted.
 */
export function answersFromStored(value: unknown): Answers {
  if (!value || typeof value !== "object") return EMPTY_ANSWERS;
  const v = value as Record<string, unknown>;
  const strings = (x: unknown) =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : [];
  // Saved before music and suburbs took more than one: a single string.
  const oneOrList = (x: unknown) => (typeof x === "string" ? [x] : strings(x));
  return {
    goals: unique(strings(v.goals).filter(isGoal)),
    music: unique(oneOrList(v.music).filter(isMusic)),
    where: pickedSuburbs(oneOrList(v.where)).slice(0, MAX_SUBURBS).map((s) => s.name),
    when: unique(strings(v.when).filter(isWhen)),
  };
}
