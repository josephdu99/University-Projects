/**
 * The first-timer funnel: three questions, then the beginner-friendly classes
 * that actually fit the answers.
 *
 * Pure and client-safe on purpose. The query that feeds it lives in
 * `first-class-data.ts`, because importing `db` from here would drag Prisma
 * into the browser bundle the moment a client component imports a type.
 *
 * Everything here scores against fields a class really has: its style, its
 * level, the instant it starts and the zone it starts in, where it is, and
 * whether it is online. Nothing is scored against a field somebody would have
 * to invent first.
 */

export type GoalId = "fun" | "fitness" | "meet" | "confidence" | "date";
export type MusicId = "latin" | "hiphop" | "classical" | "afro" | "any";
export type WhenId = "weekday" | "weekend" | "lunch";

export type Answers = {
  goals: GoalId[];
  music: MusicId | null;
  where: string;
  when: WhenId[];
};

export const EMPTY_ANSWERS: Answers = {
  goals: [],
  music: null,
  where: "",
  when: [],
};

export const GOALS: { id: GoalId; label: string; hint: string }[] = [
  { id: "fun", label: "Fun", hint: "A night out that isn't a bar" },
  { id: "fitness", label: "Fitness", hint: "Cardio that doesn't feel like it" },
  { id: "meet", label: "Meet people", hint: "New faces, easy conversation" },
  { id: "confidence", label: "Confidence", hint: "Feel at home in your body" },
  { id: "date", label: "Date night", hint: "Something new to do together" },
];

/**
 * Music taste maps onto the styles hosts actually file their classes under.
 * Matching is on the class's own `style` string, lowercased, so a style nobody
 * teaches simply never matches rather than quietly mis-filing a class.
 */
export const MUSIC: {
  id: MusicId;
  label: string;
  hint: string;
  styles: string[];
}[] = [
  {
    id: "latin",
    label: "Latin & pop",
    hint: "Salsa, reggaeton, bachata",
    styles: ["salsa", "bachata", "reggaeton", "kizomba", "tango"],
  },
  {
    id: "hiphop",
    label: "Hip hop & R&B",
    hint: "Beats you can nod to",
    styles: ["hip hop", "hiphop", "breaking", "waacking", "house", "heels"],
  },
  {
    id: "classical",
    label: "Classical & soundtracks",
    hint: "Piano, strings, film scores",
    styles: ["ballet", "contemporary", "jazz", "flow"],
  },
  {
    id: "afro",
    label: "Afrobeats & dancehall",
    hint: "Big rhythm, big energy",
    styles: ["afrobeats", "dancehall"],
  },
  { id: "any", label: "Anything upbeat", hint: "Surprise me", styles: [] },
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
 * The handoff called every result a "First Timer class", a designation the app
 * has no field for. `level` is the nearest real thing, so BEGINNER earns that
 * badge and ALL_LEVELS gets the weaker, true one. Anything pitched at
 * intermediate or advanced dancers is not shown in this funnel at all.
 */
export type Openness = "first-timer" | "all-levels";

export function opennessOf(level: string): Openness | null {
  if (level === "BEGINNER") return "first-timer";
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
  hostName: string;
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
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday,
  );
  return { day: day < 0 ? 0 : day, hour };
}

export function matchesWhen(
  c: Pick<CandidateClass, "startTime" | "timezone">,
  when: WhenId[],
): boolean {
  if (when.length === 0) return true;
  const { day, hour } = localDayHour(c.startTime, c.timezone);
  const weekday = day >= 1 && day <= 5;
  return when.some((w) =>
    w === "weekend"
      ? day === 0 || day === 6
      : w === "weekday"
        ? weekday && hour >= 17
        : weekday && hour >= 12 && hour < 14,
  );
}

export function matchesMusic(
  c: Pick<CandidateClass, "style">,
  music: MusicId | null,
): boolean {
  if (!music || music === "any") return true;
  const styles = MUSIC.find((m) => m.id === music)?.styles ?? [];
  return styles.includes(c.style.trim().toLowerCase());
}

/**
 * Does this class happen somewhere the dancer said they can get to?
 *
 * Online classes match any answer, because "where" does not constrain them.
 * Otherwise the suburb is matched against the studio's city and the class's
 * own location text, both ways round, so "Surry Hills" finds a class listed at
 * "214 Crown St, Surry Hills".
 */
export function matchesWhere(
  c: Pick<CandidateClass, "format" | "location" | "studioCity">,
  where: string,
): boolean {
  const q = where.trim().toLowerCase();
  if (!q) return true;
  if (c.format === "ONLINE") return true;
  const haystack = [c.studioCity, c.location]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return haystack.includes(q) || q.includes(haystack);
}

export type ScoredClass = CandidateClass & {
  score: number;
  openness: Openness;
  /** Why this one came up, in the dancer's own terms. All of it checkable. */
  reasons: string[];
};

/**
 * Rank the candidates. Every point is tied to something the class really is,
 * and every reason names the thing that earned it, so a dancer can check the
 * claim against the class page rather than taking it on faith.
 */
export function rankClasses(
  classes: CandidateClass[],
  answers: Answers,
): ScoredClass[] {
  const scored = classes.flatMap((c) => {
    const openness = opennessOf(c.level);
    if (!openness) return [];

    const reasons: string[] = [];
    let score = 0;

    if (openness === "first-timer") {
      score += 4;
      reasons.push("Pitched at people who have never danced before.");
    } else {
      score += 1;
      reasons.push("Open to all levels, so beginners are expected.");
    }

    if (answers.music && answers.music !== "any" && matchesMusic(c, answers.music)) {
      score += 3;
      reasons.push(`${c.style} sits in the ${musicLabel(answers.music)} you picked.`);
    }

    if (matchesWhen(c, answers.when)) {
      score += 2;
      const { hour } = localDayHour(c.startTime, c.timezone);
      reasons.push(
        hour >= 17
          ? "Starts in the evening, after work."
          : hour < 12
            ? "A morning class."
            : "Runs in the middle of the day.",
      );
    }

    if (answers.where.trim() && matchesWhere(c, answers.where)) {
      score += 2;
      reasons.push(
        c.format === "ONLINE"
          ? "Online, so you can join from wherever you are."
          : `Held in ${c.studioCity ?? answers.where.trim()}.`,
      );
    }

    // Goals are read off real attributes, never asserted. A goal with nothing
    // real behind it simply adds no reason.
    const seatsLeft = c.capacity - c.seatsTaken;
    if (answers.goals.includes("meet")) {
      if (c.format === "IN_PERSON") {
        score += 1;
        reasons.push("In a room with other people, not over video.");
      }
    }
    if (answers.goals.includes("confidence") && c.firstTimersBooked > 0) {
      score += 1;
      reasons.push(
        c.firstTimersBooked === 1
          ? "Somebody else booked in has never danced here either."
          : `${c.firstTimersBooked} others booked in have never danced here either.`,
      );
    }
    if (answers.goals.includes("date") && seatsLeft >= 2) {
      score += 1;
      reasons.push("At least two seats left, so you can book for two.");
    }
    if (answers.goals.includes("fitness") && c.durationMin >= 60) {
      score += 1;
      reasons.push(`${c.durationMin} minutes of moving.`);
    }

    // Sooner is better, very slightly, so a class next week beats the same
    // class next month when nothing else separates them.
    const days = (c.startTime.getTime() - Date.now()) / 86_400_000;
    score += Math.max(0, 2 - days / 14);

    return [{ ...c, score, openness, reasons }];
  });

  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.startTime.getTime() - b.startTime.getTime() ||
      a.title.localeCompare(b.title),
  );
}

/** The chips the results page shows back, so the answers stay visible. */
export function answerChips(a: Answers): string[] {
  return [
    ...a.goals.map(goalLabel),
    a.music ? musicLabel(a.music) : "",
    a.where.trim(),
    ...a.when.map(whenLabel),
  ].filter(Boolean);
}

/** Round-trips the answers through a URL, so results are linkable. */
export function answersToParams(a: Answers): URLSearchParams {
  const p = new URLSearchParams();
  if (a.goals.length) p.set("goals", a.goals.join(","));
  if (a.music) p.set("music", a.music);
  if (a.where.trim()) p.set("where", a.where.trim());
  if (a.when.length) p.set("when", a.when.join(","));
  return p;
}

export function answersFromParams(p: {
  goals?: string;
  music?: string;
  where?: string;
  when?: string;
}): Answers {
  return {
    goals: (p.goals ?? "").split(",").filter(isGoal),
    music: p.music && isMusic(p.music) ? p.music : null,
    where: (p.where ?? "").slice(0, 80),
    when: (p.when ?? "").split(",").filter(isWhen),
  };
}
