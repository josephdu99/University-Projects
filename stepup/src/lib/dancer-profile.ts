import { db } from "@/lib/db";
import { isoWeekKeyInTimeZone, formatInTimeZone } from "@/lib/time";

/**
 * The dancer profile's content, all derived from what actually happened.
 *
 * Deliberately no points, levels-as-score, badges, ranks or streaks: the
 * journey step comes from product rules, the tracker is a rolling window that
 * cannot break, and moments are events rather than achievements — so nothing
 * here can render as something the dancer failed to unlock.
 */

export const JOURNEY_STEPS = [
  "Beginner",
  "Social dancer",
  "Confident lead/follow",
] as const;

/** Weeks shown in the rolling consistency tracker. */
const WINDOW_WEEKS = 4;

export type DancerProfile = {
  journey: { steps: readonly string[]; currentIndex: number; explanation: string };
  weeks: boolean[];
  weeksDanced: number;
  stats: { label: string; value: number; unit: string; note: string }[];
  moments: { when: string; title: string; body: string }[];
  summary: string;
  nextStep: string;
  classesDanced: number;
};

/** English plurals we actually use here; "class" is the one that bites. */
const PLURALS: Record<string, string> = { class: "classes" };

function plural(n: number, one: string, many = PLURALS[one] ?? `${one}s`) {
  return n === 1 ? one : many;
}

/** Joins names the way a person would say them out loud. */
function list(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export async function getDancerProfile(
  userId: string,
  timezone: string
): Promise<DancerProfile> {
  const attended = await db.booking.findMany({
    where: { userId, status: "ATTENDED" },
    orderBy: { attendedAt: "asc" },
    select: {
      attendedAt: true,
      bookedAt: true,
      class: {
        select: {
          title: true,
          style: true,
          format: true,
          startTime: true,
          timezone: true,
          studio: { select: { id: true, name: true } },
          host: { select: { id: true, name: true, displayName: true } },
        },
      },
    },
  });

  // The very first booking counts as a moment even if they never turned up.
  const firstBooking = await db.booking.findFirst({
    where: { userId },
    orderBy: { bookedAt: "asc" },
    select: {
      bookedAt: true,
      class: {
        select: {
          title: true,
          startTime: true,
          studio: { select: { name: true } },
          host: { select: { name: true, displayName: true } },
        },
      },
    },
  });

  const classesDanced = attended.length;

  const styleNames = Array.from(
    new Set(attended.map((b) => b.class.style))
  );
  const studioNames = Array.from(
    new Set(
      attended
        .filter((b) => b.class.format !== "ONLINE" && b.class.studio)
        .map((b) => b.class.studio!.name)
    )
  );
  const onlineTeachers = Array.from(
    new Set(
      attended
        .filter((b) => b.class.format === "ONLINE")
        .map((b) => b.class.host.displayName?.trim() || b.class.host.name)
    )
  );

  // ── Rolling 4-week window, resolved in the dancer's own zone ──────────────
  const now = new Date();
  const windowKeys: string[] = [];
  for (let i = WINDOW_WEEKS - 1; i >= 0; i--) {
    windowKeys.push(
      isoWeekKeyInTimeZone(new Date(now.getTime() - i * 7 * 86_400_000), timezone)
    );
  }
  const dancedWeeks = new Set(
    attended
      .filter((b) => b.attendedAt)
      .map((b) => isoWeekKeyInTimeZone(b.attendedAt!, timezone))
  );
  const weeks = windowKeys.map((k) => dancedWeeks.has(k));
  const weeksDanced = weeks.filter(Boolean).length;

  // ── Journey step, from product rules rather than any score ────────────────
  let currentIndex = 0;
  if (classesDanced >= 12 && styleNames.length >= 3) currentIndex = 2;
  else if (classesDanced >= 3 && styleNames.length >= 2) currentIndex = 1;

  const explanation =
    currentIndex === 0
      ? classesDanced === 0
        ? "Nothing here yet. Book your first class and this fills in as you go."
        : `${classesDanced} ${plural(classesDanced, "class")} so far. A couple more, in a second style, and you are a social dancer.`
      : currentIndex === 1
        ? `${classesDanced} classes across ${styleNames.length} ${plural(styleNames.length, "style")}. Next is leading and following with confidence, which comes from partner work rather than more classes.`
        : `${classesDanced} classes across ${styleNames.length} styles. You know your way around a floor. From here it is about the rooms you have not danced in yet.`;

  // ── Stats, each with a context line pulled from the same data ────────────
  const thisMonthKey = formatInTimeZone(now, timezone, "yyyy-MM");
  const classesThisMonth = attended.filter(
    (b) => b.attendedAt && formatInTimeZone(b.attendedAt, timezone, "yyyy-MM") === thisMonthKey
  ).length;

  const stats: DancerProfile["stats"] = [
    {
      label: "Classes danced",
      value: classesDanced,
      unit: "so far",
      note:
        classesThisMonth > 0
          ? `${classesThisMonth === classesDanced ? "All" : classesThisMonth} of them this month`
          : classesDanced > 0
            ? "None yet this month"
            : "Your first one is waiting",
    },
    {
      label: "Styles tried",
      value: styleNames.length,
      unit: plural(styleNames.length, "style"),
      note: styleNames.length > 0 ? list(styleNames) : "Pick any one to start",
    },
    {
      label: "Studios visited",
      value: studioNames.length,
      unit: plural(studioNames.length, "studio"),
      note:
        onlineTeachers.length > 0
          ? `Plus ${onlineTeachers.length} ${plural(onlineTeachers.length, "teacher")} online`
          : studioNames.length > 0
            ? list(studioNames)
            : "In person or online, both count",
    },
  ];

  // ── Moments: things that happened, newest last ───────────────────────────
  // `rank` breaks ties: two moments can land in the same month, and the first
  // booking must never sort after something it caused.
  const dated: { at: Date; rank: number; when: string; title: string; body: string }[] = [];
  const when = (d: Date) => formatInTimeZone(d, timezone, "MMMM yyyy");

  if (firstBooking) {
    const venue =
      firstBooking.class.studio?.name ??
      firstBooking.class.host.displayName?.trim() ??
      firstBooking.class.host.name;
    // A booking row can be written after the class it points at — a backfill,
    // or seeded data. Date this from the earliest evidence either way, so the
    // timeline cannot claim you booked after you danced.
    const firstAt =
      firstBooking.bookedAt < firstBooking.class.startTime
        ? firstBooking.bookedAt
        : firstBooking.class.startTime;
    dated.push({
      at: firstAt,
      rank: 0,
      when: when(firstAt),
      title: "First class booked",
      body: `${firstBooking.class.title} at ${venue}.`,
    });
  }

  // Three consecutive weeks with attendance — the point it stopped being a one-off.
  const weekKeys = attended
    .filter((b) => b.attendedAt)
    .map((b) => isoWeekKeyInTimeZone(b.attendedAt!, timezone));
  const runStart = findThreeInARow(attended, weekKeys);
  if (runStart) {
    dated.push({
      at: runStart,
      rank: 2,
      when: when(runStart),
      title: "Came back three weeks running",
      body: "The point where it stopped being a one-off.",
    });
  }

  // The class that introduced a second style.
  const seen = new Set<string>();
  const secondStyle = attended.find((b) => {
    seen.add(b.class.style);
    return seen.size === 2;
  });
  if (secondStyle?.attendedAt) {
    dated.push({
      at: secondStyle.attendedAt,
      rank: 1,
      when: when(secondStyle.attendedAt),
      title: "Tried a second style",
      body: `${secondStyle.class.title}${secondStyle.class.studio ? ` at ${secondStyle.class.studio.name}` : ""}.`,
    });
  }

  const firstOnline = attended.find((b) => b.class.format === "ONLINE" && b.attendedAt);
  if (firstOnline?.attendedAt) {
    const teacher =
      firstOnline.class.host.displayName?.trim() || firstOnline.class.host.name;
    dated.push({
      at: firstOnline.attendedAt,
      rank: 3,
      when: when(firstOnline.attendedAt),
      title: "Danced online for the first time",
      body: `${firstOnline.class.title} with ${teacher}.`,
    });
  }

  dated.sort((a, b) => a.at.getTime() - b.at.getTime() || a.rank - b.rank);
  const moments = dated.map(({ when, title, body }) => ({ when, title, body }));

  const summaryParts = [
    `${classesDanced} ${plural(classesDanced, "class")}`,
    `${styleNames.length} ${plural(styleNames.length, "style")}`,
  ];
  if (studioNames.length > 0) {
    summaryParts.push(`${studioNames.length} ${plural(studioNames.length, "studio")}`);
  }

  return {
    journey: { steps: JOURNEY_STEPS, currentIndex, explanation },
    weeks,
    weeksDanced,
    stats,
    moments,
    summary: summaryParts.join(", "),
    nextStep:
      currentIndex === 0
        ? "Next: book a class. Any style, any night, whatever is closest."
        : currentIndex === 1
          ? "Next: dance with a partner you have not met. It is the step that turns classes into social dancing."
          : "Next: try a room you have not danced in. A new studio changes more than a new style does.",
    classesDanced,
  };
}

/**
 * Returns the date of the first class in a run of three consecutive ISO weeks,
 * or null. Week keys are already resolved in the dancer's zone.
 */
function findThreeInARow(
  attended: { attendedAt: Date | null }[],
  weekKeys: string[]
): Date | null {
  const withDates = attended.filter((b) => b.attendedAt);
  const unique: { key: string; at: Date }[] = [];
  weekKeys.forEach((key, i) => {
    if (!unique.some((u) => u.key === key)) {
      unique.push({ key, at: withDates[i].attendedAt! });
    }
  });

  for (let i = 0; i + 2 < unique.length; i++) {
    if (
      isNextWeek(unique[i].key, unique[i + 1].key) &&
      isNextWeek(unique[i + 1].key, unique[i + 2].key)
    ) {
      return unique[i].at;
    }
  }
  return null;
}

/** "2026-W12" → "2026-W13", handling the year roll. */
function isNextWeek(a: string, b: string): boolean {
  const [ay, aw] = a.split("-W").map(Number);
  const [by, bw] = b.split("-W").map(Number);
  if (ay === by) return bw === aw + 1;
  return by === ay + 1 && bw === 1;
}
