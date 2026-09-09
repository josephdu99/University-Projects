import { db } from "@/lib/db";
import { isoWeekKeyInTimeZone, monthBoundsInTimeZone } from "@/lib/time";

/**
 * What a host's profile can say about their teaching, for both a studio owner
 * and an independent instructor. The two pages are the same shape; only the
 * stage names and a little copy differ.
 *
 * Same rule as the dancer profile: every figure comes from classes that were
 * actually hosted and bookings that were actually made. Where a design asks
 * for a judgement the app cannot make, the copy states the measured number
 * and lets the host draw the conclusion.
 */

export type HostKind = "studio" | "instructor";

export type Stage = { label: string; state: "done" | "current" | "todo" };

export type HostStat = {
  label: string;
  value: string;
  unit: string;
  note: string;
};

export type HostProfileData = {
  stages: Stage[];
  headline: string;
  note: string;
  weeks: boolean[];
  weeksLine: string;
  stats: HostStat[];
  /** Month and year the first class was hosted, e.g. "January 2026". */
  hostingSince: string | null;
};

const STAGES: Record<HostKind, readonly [string, string, string]> = {
  studio: ["New studio", "Free classes", "Paid workshops"],
  instructor: ["New instructor", "Free classes", "Paid sessions"],
};

export async function getHostProfile(host: {
  id: string;
  timezone: string;
  payoutsActive: boolean;
  kind: HostKind;
}): Promise<HostProfileData> {
  const now = new Date();

  const classes = await db.danceClass.findMany({
    where: { hostId: host.id, cancelledAt: null },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      style: true,
      startTime: true,
      capacity: true,
      priceCents: true,
      bookings: {
        where: { status: { in: ["BOOKED", "ATTENDED"] } },
        select: { userId: true, status: true },
      },
    },
  });

  const held = classes.filter((c) => c.startTime <= now);
  const { start: monthStart } = monthBoundsInTimeZone(now, host.timezone);
  const thisMonth = held.filter((c) => c.startTime >= monthStart).length;

  // ── Dancers taught ────────────────────────────────────────────────────────
  const attendanceByDancer = new Map<string, number>();
  for (const c of held) {
    for (const b of c.bookings) {
      if (b.status !== "ATTENDED") continue;
      attendanceByDancer.set(b.userId, (attendanceByDancer.get(b.userId) ?? 0) + 1);
    }
  }
  const taught = attendanceByDancer.size;
  const returning = [...attendanceByDancer.values()].filter((n) => n >= 2).length;

  // ── Average fill, over the most recent six classes that have happened ─────
  const recent = held.slice(-6);
  const fill = averageFill(recent);

  const styles = [...new Set(classes.map((c) => c.style))];
  const hasPaid = classes.some((c) => c.priceCents > 0);

  // ── Stage ─────────────────────────────────────────────────────────────────
  // Countable, not a judgement: nothing hosted yet, hosting, or actually
  // charging with payouts able to receive the money.
  const stageIndex =
    host.payoutsActive && hasPaid ? 2 : held.length > 0 ? 1 : 0;

  const stages: Stage[] = STAGES[host.kind].map((label, i) => ({
    label,
    state: i === stageIndex ? "current" : i < stageIndex ? "done" : "todo",
  }));

  // ── Last four weeks ───────────────────────────────────────────────────────
  const hostedWeeks = new Set(
    held.map((c) => isoWeekKeyInTimeZone(c.startTime, host.timezone))
  );
  const weeks = [3, 2, 1, 0].map((back) =>
    hostedWeeks.has(
      isoWeekKeyInTimeZone(new Date(now.getTime() - back * 7 * 86400000), host.timezone)
    )
  );
  const active = weeks.filter(Boolean).length;

  return {
    stages,
    headline: headlineFor(host.kind, stageIndex, held.length),
    note: noteFor(stageIndex, held.length, fill, host.payoutsActive),
    weeks,
    weeksLine: `You hosted a class in ${active} of your last ${weeks.length} weeks.`,
    stats: [
      {
        label: "Classes hosted",
        value: String(held.length),
        unit: "so far",
        note: thisMonth
          ? `${thisMonth} of them this month`
          : "None yet this month",
      },
      {
        label: "Dancers taught",
        value: String(taught),
        unit: taught === 1 ? "person" : "people",
        note: returning
          ? `${returning} came back twice or more`
          : "Nobody has come back twice yet",
      },
      {
        label: "Average fill",
        value: fill === null ? "—" : `${fill}%`,
        unit: fill === null ? "no data yet" : "of spots",
        note:
          recent.length === 0
            ? "Once a class has run this fills in"
            : `Across your last ${recent.length === 1 ? "class" : `${recent.length} classes`}`,
      },
      // An instructor usually teaches one thing, so naming it says more than
      // counting it. A studio offering several is better described by a count.
      styles.length === 1
        ? {
            label: "Style",
            value: styles[0],
            unit: "",
            note: "Add another when you teach it",
          }
        : {
            label: host.kind === "studio" ? "Styles offered" : "Styles taught",
            value: String(styles.length),
            unit: "styles",
            note: styles.length ? listOf(styles) : "Nothing listed yet",
          },
    ],
    hostingSince: held.length ? monthYear(held[0].startTime, host.timezone) : null,
  };
}

/** Seats taken over seats offered, as a whole percentage. */
function averageFill(
  classes: { capacity: number; bookings: unknown[] }[]
): number | null {
  const seats = classes.reduce((sum, c) => sum + c.capacity, 0);
  if (seats === 0) return null;
  const taken = classes.reduce((sum, c) => sum + c.bookings.length, 0);
  return Math.round((taken / seats) * 100);
}

function headlineFor(kind: HostKind, stage: number, hosted: number) {
  if (stage === 0) {
    return kind === "studio"
      ? "You have not hosted a class yet."
      : "You have not taught a class yet.";
  }
  if (stage === 1) {
    // The design's "Two classes in. Keep going." only reads right early on.
    return hosted <= 3 && kind === "instructor"
      ? `${hosted} ${hosted === 1 ? "class" : "classes"} in. Keep going.`
      : "You're running free classes.";
  }
  return "You're running paid classes.";
}

function noteFor(
  stage: number,
  hosted: number,
  fill: number | null,
  payoutsActive: boolean
) {
  if (stage === 0) {
    return "Publish your first class and the numbers below start filling in. Free classes need no payment setup at all.";
  }

  const filling =
    fill === null
      ? `${count(hosted, "class", "classes")} hosted.`
      : `${count(hosted, "class", "classes")} hosted, filling ${fill}% of the spots you offer.`;

  if (stage === 1) {
    return payoutsActive
      ? `${filling} Payouts are connected, so you can put a price on a class whenever you want to.`
      : `${filling} Payouts are the one thing left before you can charge for a class.`;
  }
  return `${filling} Payouts are connected and money reaches your account directly.`;
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

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
