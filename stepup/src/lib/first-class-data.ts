import { db } from "@/lib/db";
import type { CandidateClass } from "@/lib/first-class";

const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

/**
 * Every upcoming class a beginner could walk into, with the two counts the
 * funnel needs: how many seats are gone, and how many of the people holding
 * them have never attended a class on StepUp before.
 *
 * That second count is the design's central piece of reassurance ("6
 * first-timers booked"), and it is computed rather than asserted: a booking
 * counts as a first-timer's when that user has no ATTENDED booking anywhere
 * before this class starts. One grouped query, not one per class.
 */
export async function getBeginnerClasses(): Promise<CandidateClass[]> {
  const classes = await db.danceClass.findMany({
    where: {
      startTime: { gte: new Date() },
      cancelledAt: null,
      level: { in: ["BEGINNER", "ALL_LEVELS"] },
    },
    orderBy: { startTime: "asc" },
    take: 60,
    include: {
      host: { select: { name: true, displayName: true } },
      studio: { select: { name: true, city: true, suspendedAt: true } },
      bookings: {
        where: { status: { in: SEAT_HOLDING } },
        select: { userId: true },
      },
    },
  });

  const live = classes.filter((c) => !c.studio || c.studio.suspendedAt === null);
  if (live.length === 0) return [];

  // Who among everyone holding a seat has ever actually attended a class?
  const holderIds = [
    ...new Set(live.flatMap((c) => c.bookings.map((b) => b.userId))),
  ];
  const veterans = new Set(
    holderIds.length === 0
      ? []
      : (
          await db.booking.findMany({
            where: { userId: { in: holderIds }, status: "ATTENDED" },
            select: { userId: true },
            distinct: ["userId"],
          })
        ).map((b) => b.userId),
  );

  return live.map((c) => ({
    id: c.id,
    title: c.title,
    style: c.style,
    level: c.level,
    format: c.format,
    location: c.location,
    startTime: c.startTime,
    timezone: c.timezone,
    durationMin: c.durationMin,
    capacity: c.capacity,
    priceCents: c.priceCents,
    currency: c.currency,
    seatsTaken: c.bookings.length,
    firstTimersBooked: c.bookings.filter((b) => !veterans.has(b.userId)).length,
    studioName: c.studio?.name ?? null,
    studioCity: c.studio?.city ?? null,
    hostName: c.host.displayName?.trim() || c.host.name,
  }));
}

/** One class for the public detail page, with the same two counts. */
export async function getPublicClass(id: string) {
  const c = await db.danceClass.findUnique({
    where: { id },
    include: {
      host: { select: { name: true, displayName: true, avatarMark: true, avatarColor: true } },
      studio: { select: { name: true, city: true, address: true, description: true, suspendedAt: true } },
      bookings: {
        where: { status: { in: SEAT_HOLDING } },
        select: { userId: true },
      },
    },
  });
  if (!c || c.cancelledAt || (c.studio && c.studio.suspendedAt !== null)) {
    return null;
  }

  const holderIds = [...new Set(c.bookings.map((b) => b.userId))];
  const veterans = new Set(
    holderIds.length === 0
      ? []
      : (
          await db.booking.findMany({
            where: { userId: { in: holderIds }, status: "ATTENDED" },
            select: { userId: true },
            distinct: ["userId"],
          })
        ).map((b) => b.userId),
  );

  return {
    ...c,
    seatsTaken: c.bookings.length,
    firstTimersBooked: c.bookings.filter((b) => !veterans.has(b.userId)).length,
    hostName: c.host.displayName?.trim() || c.host.name,
  };
}

/**
 * Other beginner-friendly classes to offer next, nearest in time first.
 * Used after a booking and after a class, where the handoff offers "try this
 * next" cards. Same style first, then anything else a beginner can join.
 */
export async function getNextOptions(params: {
  excludeClassId: string;
  style: string;
  take?: number;
}) {
  const rows = await db.danceClass.findMany({
    where: {
      id: { not: params.excludeClassId },
      startTime: { gte: new Date() },
      cancelledAt: null,
      level: { in: ["BEGINNER", "ALL_LEVELS"] },
    },
    orderBy: { startTime: "asc" },
    take: 24,
    include: {
      host: { select: { name: true, displayName: true } },
      studio: { select: { name: true, city: true, suspendedAt: true } },
    },
  });

  const live = rows.filter((c) => !c.studio || c.studio.suspendedAt === null);
  const same = params.style.trim().toLowerCase();
  const sorted = [
    ...live.filter((c) => c.style.trim().toLowerCase() === same),
    ...live.filter((c) => c.style.trim().toLowerCase() !== same),
  ];
  return sorted.slice(0, params.take ?? 2).map((c) => ({
    id: c.id,
    title: c.title,
    style: c.style,
    startTime: c.startTime,
    timezone: c.timezone,
    priceCents: c.priceCents,
    currency: c.currency,
    format: c.format,
    studioName: c.studio?.name ?? null,
    studioCity: c.studio?.city ?? null,
    hostName: c.host.displayName?.trim() || c.host.name,
    sameStyle: c.style.trim().toLowerCase() === same,
  }));
}
