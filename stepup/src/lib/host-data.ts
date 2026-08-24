import { db } from "@/lib/db";
import { publicName } from "@/lib/roles";

/** Booking states that occupy a seat. */
const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

export type HostClass = {
  id: string;
  title: string;
  style: string;
  format: string;
  level: string;
  startTime: Date;
  timezone: string;
  durationMin: number;
  capacity: number;
  priceCents: number;
  currency: string;
  points: number;
  description: string;
  location: string | null;
  onlineLink: string | null;
  cancelledAt: Date | null;
  seriesId: string | null;
  booked: number;
};

export type Face = { id: string; name: string };

export type HostDashboard = {
  upcoming: HostClass[];
  past: HostClass[];
  hostedCount: number;
  checkInCount: number;
  checkInFaces: Face[];
  dancers: { size: number; faces: Face[] };
  /** Fill of the most recent past class, for the empty state's honest line. */
  lastPastFill: { booked: number; capacity: number } | null;
  /** Average fill across past classes, as a percentage. Null with no history. */
  averageFillPct: number | null;
  bestFill: { title: string; booked: number; capacity: number } | null;
};

function shape(c: {
  id: string;
  title: string;
  style: string;
  format: string;
  level: string;
  startTime: Date;
  timezone: string;
  durationMin: number;
  capacity: number;
  priceCents: number;
  currency: string;
  points: number;
  description: string;
  location: string | null;
  onlineLink: string | null;
  cancelledAt: Date | null;
  seriesId: string | null;
  _count: { bookings: number };
}): HostClass {
  const { _count, ...rest } = c;
  return { ...rest, booked: _count.bookings };
}

/**
 * Everything the studio / instructor dashboard renders, in one round trip.
 *
 * Upcoming vs past is decided against the real instant, and each class carries
 * its own timezone for display — the page promises "class times in {tz}" and
 * has to keep that promise regardless of where the owner is sitting.
 */
export async function getHostDashboard(hostId: string): Promise<HostDashboard> {
  const [classes, checkInCount, checkInRows, dancerRows, dancerCount] =
    await Promise.all([
      db.danceClass.findMany({
        where: { hostId },
        include: {
          _count: {
            select: { bookings: { where: { status: { in: SEAT_HOLDING } } } },
          },
        },
        orderBy: { startTime: "desc" },
        take: 200,
      }),
      db.booking.count({ where: { class: { hostId }, status: "ATTENDED" } }),
      // Faces for the check-in avatar stack: most recent attendees, deduped.
      db.booking.findMany({
        where: { class: { hostId }, status: "ATTENDED" },
        distinct: ["userId"],
        orderBy: { attendedAt: "desc" },
        take: 3,
        select: { user: { select: { id: true, name: true, displayName: true } } },
      }),
      db.booking.findMany({
        where: { class: { hostId }, status: { in: ["BOOKED", "ATTENDED"] } },
        distinct: ["userId"],
        orderBy: { bookedAt: "desc" },
        take: 5,
        select: { user: { select: { id: true, name: true, displayName: true } } },
      }),
      // Distinct dancers who have ever taken a class here.
      db.booking
        .groupBy({
          by: ["userId"],
          where: { class: { hostId }, status: { in: ["BOOKED", "ATTENDED"] } },
        })
        .then((rows) => rows.length),
    ]);

  const now = new Date();
  const shaped = classes.map(shape);
  const upcoming = shaped
    .filter((c) => c.startTime >= now && !c.cancelledAt)
    .reverse();
  const past = shaped.filter((c) => c.startTime < now || c.cancelledAt);

  const withCapacity = past.filter((c) => c.capacity > 0);
  const averageFillPct =
    withCapacity.length > 0
      ? Math.round(
          (withCapacity.reduce((sum, c) => sum + c.booked / c.capacity, 0) /
            withCapacity.length) *
            100
        )
      : null;

  const best = withCapacity.reduce<HostClass | null>(
    (top, c) =>
      top === null || c.booked / c.capacity > top.booked / top.capacity ? c : top,
    null
  );

  return {
    upcoming,
    past,
    hostedCount: shaped.length,
    checkInCount,
    checkInFaces: checkInRows.map((r) => ({
      id: r.user.id,
      name: publicName(r.user),
    })),
    dancers: {
      size: dancerCount,
      faces: dancerRows.map((r) => ({ id: r.user.id, name: publicName(r.user) })),
    },
    lastPastFill: past[0]
      ? { booked: past[0].booked, capacity: past[0].capacity }
      : null,
    averageFillPct,
    bestFill: best
      ? { title: best.title, booked: best.booked, capacity: best.capacity }
      : null,
  };
}

/** The people who have taken a class with this host, newest first. */
export async function getHostDancers(hostId: string) {
  const rows = await db.booking.findMany({
    where: { class: { hostId }, status: { in: ["BOOKED", "ATTENDED"] } },
    orderBy: { bookedAt: "desc" },
    select: {
      status: true,
      bookedAt: true,
      user: {
        select: { id: true, name: true, displayName: true, homeCity: true },
      },
      class: { select: { title: true, startTime: true, timezone: true } },
    },
  });

  // Collapse to one entry per dancer, keeping their most recent class and a
  // count of how many times they have turned up.
  const byUser = new Map<
    string,
    {
      id: string;
      name: string;
      homeCity: string | null;
      classesTaken: number;
      attended: number;
      lastClass: { title: string; startTime: Date; timezone: string };
    }
  >();

  for (const row of rows) {
    const existing = byUser.get(row.user.id);
    if (existing) {
      existing.classesTaken += 1;
      if (row.status === "ATTENDED") existing.attended += 1;
      continue;
    }
    byUser.set(row.user.id, {
      id: row.user.id,
      name: publicName(row.user),
      homeCity: row.user.homeCity,
      classesTaken: 1,
      attended: row.status === "ATTENDED" ? 1 : 0,
      lastClass: row.class,
    });
  }

  return Array.from(byUser.values());
}
