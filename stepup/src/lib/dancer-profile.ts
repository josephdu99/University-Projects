import { db } from "@/lib/db";
import { isoWeekKeyInTimeZone, monthBoundsInTimeZone } from "@/lib/time";

/**
 * Everything the dancer profile shows about a dancer's history.
 *
 * The rule this module follows: every number and every sentence is derived
 * from attendance that actually happened. Where the design asked for something
 * the app cannot know — how many friends you brought, for instance — the
 * figure is absent rather than invented.
 */

export type JourneyStage = { label: string; state: "done" | "current" | "todo" };

export type Moment = { when: string; title: string; body: string };

export type Stat = { label: string; value: number; unit: string; note: string };

export type DancerProfileData = {
  /** Named stages, with the one the dancer has reached marked current. */
  journey: JourneyStage[];
  /** Headline for the dark panel, e.g. "You're a social dancer now." */
  headline: string;
  /** The sentence under it — real counts, and what the next stage takes. */
  summary: string;
  /** Did they dance in each of the last four ISO weeks, oldest first. */
  weeks: boolean[];
  weeksLine: string;
  stats: Stat[];
  statsCaption: string;
  moments: Moment[];
  /** The single suggested next step, or null when there isn't a true one. */
  nextStep: { text: string; href: string; cta: string } | null;
  /** Month and year of the first class attended, e.g. "March 2026". */
  dancingSince: string | null;
};

const STAGES = ["Beginner", "Social dancer", "Regular"] as const;

export async function getDancerProfile(viewer: {
  id: string;
  timezone: string;
}): Promise<DancerProfileData> {
  const attended = await db.booking.findMany({
    where: { userId: viewer.id, status: "ATTENDED" },
    orderBy: { attendedAt: "asc" },
    include: {
      class: {
        select: {
          title: true,
          style: true,
          format: true,
          startTime: true,
          studio: { select: { name: true } },
          host: { select: { name: true, displayName: true } },
        },
      },
    },
  });

  const tz = viewer.timezone;
  // `attendedAt` is when the check-in happened; the class's own start time is
  // what the dancer remembers, so dates in the story come from that.
  const events = attended.map((b) => ({
    at: b.attendedAt ?? b.class.startTime,
    on: b.class.startTime,
    ...b.class,
  }));

  const styles = [...new Set(events.map((e) => e.style))];
  const studios = [...new Set(events.flatMap((e) => (e.studio ? [e.studio.name] : [])))];
  const online = events.filter((e) => e.format === "ONLINE").length;

  const { start: monthStart } = monthBoundsInTimeZone(new Date(), tz);
  const thisMonth = events.filter((e) => e.at >= monthStart).length;

  // ── Journey ───────────────────────────────────────────────────────────────
  // Countable thresholds, so the stage is never a judgement the app can't make.
  const stageIndex =
    events.length >= 10 ? 2 : events.length >= 3 && styles.length >= 2 ? 1 : 0;

  const journey: JourneyStage[] = STAGES.map((label, i) => ({
    label,
    state: i === stageIndex ? "current" : i < stageIndex ? "done" : "todo",
  }));

  const headline = [
    "You're just getting started.",
    "You're a social dancer now.",
    "You're a regular.",
  ][stageIndex];

  const summary = summaryFor(stageIndex, events.length, styles.length);

  // ── Last four weeks ───────────────────────────────────────────────────────
  const danced = new Set(events.map((e) => isoWeekKeyInTimeZone(e.at, tz)));
  const now = new Date();
  const weeks = [3, 2, 1, 0].map((back) =>
    danced.has(
      isoWeekKeyInTimeZone(new Date(now.getTime() - back * 7 * 86400000), tz)
    )
  );
  const dancedWeeks = weeks.filter(Boolean).length;

  // ── Stats ─────────────────────────────────────────────────────────────────
  // "Friends brought" is in the design but there is no referral or connection
  // data behind it, so the tile is left out rather than filled with a guess.
  const stats: Stat[] = [
    {
      label: "Classes danced",
      value: events.length,
      unit: "so far",
      note: thisMonth
        ? `${thisMonth} of them this month`
        : "None yet this month",
    },
    {
      label: "Styles tried",
      value: styles.length,
      unit: styles.length === 1 ? "style" : "styles",
      note: styles.length ? listOf(styles) : "Your first is waiting",
    },
    {
      label: "Studios visited",
      value: studios.length,
      unit: studios.length === 1 ? "studio" : "studios",
      note: online
        ? `Plus ${online} online ${online === 1 ? "class" : "classes"}`
        : "All in person so far",
    },
  ];

  return {
    journey,
    headline,
    summary,
    weeks,
    weeksLine: `You danced in ${dancedWeeks} of your last ${weeks.length} weeks.`,
    stats,
    statsCaption: caption(events.length, styles.length, studios.length),
    moments: momentsFrom(events, tz),
    nextStep: nextStepFor({ count: events.length, styles: styles.length, online }),
    dancingSince: events.length ? monthYear(events[0].on, tz) : null,
  };
}

function summaryFor(stage: number, classes: number, styles: number) {
  const done = `${count(classes, "class", "classes")} across ${count(styles, "style", "styles")}.`;
  if (stage === 0) {
    return `${done} Three classes across two styles is where it starts to feel like a habit rather than a one-off.`;
  }
  if (stage === 1) {
    return `${done} Ten classes is the next marker, by then the steps stop being the thing you are thinking about.`;
  }
  return `${done} You are past the point where turning up is the hard part.`;
}

function caption(classes: number, styles: number, studios: number) {
  if (classes === 0) return "Nothing on the board yet";
  return [
    count(classes, "class", "classes"),
    count(styles, "style", "styles"),
    count(studios, "studio", "studios"),
  ].join(", ");
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Names a few items and says how many are left, rather than truncating
 * silently — "Hip Hop, Contemporary, Salsa" beside a count of 6 reads as a
 * contradiction.
 */
function listOf(items: string[], shown = 3) {
  if (items.length <= shown) return items.join(", ");
  return `${items.slice(0, shown).join(", ")} and ${items.length - shown} more`;
}

function monthYear(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(instant);
}

type Event = {
  at: Date;
  on: Date;
  title: string;
  style: string;
  format: string;
  studio: { name: string } | null;
};

/**
 * The story, built only from things the attendance record proves happened.
 * Ordered by the date of the class itself, so a back-filled check-in cannot
 * put a milestone before the class that caused it.
 */
function momentsFrom(events: Event[], tz: string): Moment[] {
  if (events.length === 0) return [];

  const moments: { on: Date; title: string; body: string }[] = [];
  const first = events[0];

  moments.push({
    on: first.on,
    title: "First class booked",
    body: `${first.title}${first.studio ? ` at ${first.studio.name}` : ""}. Where it started.`,
  });

  // First time a second style appears.
  const seen = new Set([first.style]);
  const secondStyle = events.find((e) => !seen.has(e.style) && seen.add(e.style));
  if (secondStyle) {
    moments.push({
      on: secondStyle.on,
      title: "Tried a second style",
      body: `${secondStyle.title}, ${secondStyle.style} after starting with ${first.style}.`,
    });
  }

  const firstOnline = events.find((e) => e.format === "ONLINE");
  if (firstOnline) {
    moments.push({
      on: firstOnline.on,
      title: "Danced online for the first time",
      body: `${firstOnline.title}, from wherever you were that day.`,
    });
  }

  // Three ISO weeks in a row is the point it stops being a one-off.
  const streak = firstThreeWeekRun(events, tz);
  if (streak) {
    moments.push({
      on: streak,
      title: "Came back three weeks running",
      body: "The point where it stopped being a one-off.",
    });
  }

  for (const milestone of [5, 10, 25]) {
    if (events.length >= milestone) {
      moments.push({
        on: events[milestone - 1].on,
        title: `${milestone}th class`,
        body: `${events[milestone - 1].title}.`,
      });
    }
  }

  // Sorted on the real date, never on the formatted month name — "August"
  // sorts before "July" alphabetically, which is how that bug happens.
  return moments
    .sort((a, b) => a.on.getTime() - b.on.getTime())
    .map((m) => ({ when: monthYear(m.on, tz), title: m.title, body: m.body }));
}

/** Date of the class that completed the first run of three ISO weeks. */
function firstThreeWeekRun(events: Event[], tz: string): Date | null {
  const byWeek = new Map<string, Date>();
  for (const e of events) {
    const key = isoWeekKeyInTimeZone(e.at, tz);
    if (!byWeek.has(key)) byWeek.set(key, e.on);
  }

  const weeks = [...byWeek.keys()].sort();
  for (let i = 2; i < weeks.length; i++) {
    if (consecutive(weeks[i - 2], weeks[i - 1]) && consecutive(weeks[i - 1], weeks[i])) {
      return byWeek.get(weeks[i]) ?? null;
    }
  }
  return null;
}

function consecutive(a: string, b: string) {
  const [ay, aw] = a.split("-W").map(Number);
  const [by, bw] = b.split("-W").map(Number);
  if (ay === by) return bw - aw === 1;
  // Across a year boundary: week 52 or 53 followed by week 1.
  return by - ay === 1 && bw === 1 && aw >= 52;
}

function nextStepFor({
  count,
  styles,
  online,
}: {
  count: number;
  styles: number;
  online: number;
}) {
  if (count === 0) {
    return {
      text: "Your first class is the whole thing. Pick one that fits your week and book it.",
      href: "/discover",
      cta: "Find a class",
    };
  }
  if (styles < 2) {
    return {
      text: "Next: try a second style. It is the fastest way to work out which one you actually want to keep doing.",
      href: "/discover",
      cta: "Browse styles",
    };
  }
  if (online === 0) {
    return {
      text: "Next: an online class. Useful for the weeks when getting to a studio is the thing standing in your way.",
      href: "/discover?format=Online",
      cta: "See online classes",
    };
  }
  return {
    text: "Next: an in-person class with a studio you have not danced at yet.",
    href: "/discover?format=In+person",
    cta: "Find one nearby",
  };
}
