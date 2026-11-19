import { db } from "@/lib/db";
import type { CandidateClass } from "@/lib/first-class";
import { findSuburb, suburbFromAddress } from "@/lib/suburbs";
import { imageUrl } from "@/lib/images";
import { studioTierRanks } from "@/lib/studio-profile";

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
      level: { in: ["ABSOLUTE_BEGINNER", "BEGINNER", "ALL_LEVELS"] },
      // Not classes a studio keeps off StepUp, and not kids' classes, which
      // a guardian books (not open yet).
      listing: { not: "HIDDEN" },
      kids: false,
    },
    orderBy: { startTime: "asc" },
    // Repeating classes have a dozen dated sessions each; enough rows to
    // still have sixty different classes once those are folded together.
    take: 400,
    include: {
      series: { select: { startsOn: true } },
      host: { select: { name: true, displayName: true } },
      studio: {
        select: { name: true, city: true, address: true, suburb: true, photoId: true, suspendedAt: true },
      },
      bookings: {
        where: { status: { in: SEAT_HOLDING } },
        select: { userId: true },
      },
    },
  });

  // One entry per class: a weekly class is offered once, at its next date,
  // rather than filling all three matches with the same class on three
  // Tuesdays. Its page lists the other nights.
  const seenSeries = new Set<string>();
  const live = classes
    .filter((c) => !c.studio || c.studio.suspendedAt === null)
    // A course is enrolled in as a whole, so it's offered only before it
    // starts, at its first class.
    .filter((c) => c.listing !== "COURSE" || (c.series && c.startTime.getTime() === c.series.startsOn.getTime()))
    .filter((c) => {
      if (!c.seriesId) return true;
      if (seenSeries.has(c.seriesId)) return false;
      seenSeries.add(c.seriesId);
      return true;
    })
    .slice(0, 60);
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

  const tiers = await studioTierRanks(live.flatMap((c) => (c.studioId ? [c.studioId] : [])));

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
    suburb: classSuburb(c),
    hostName: c.host.displayName?.trim() || c.host.name,
    music: c.music,
    photoUrl: imageUrl(c.studio?.photoId),
    tierRank: c.studioId ? (tiers.get(c.studioId) ?? 0) : 0,
  }));
}

/**
 * The Sydney suburb a class is in. Online classes are in none, whatever their
 * host's studio says. Otherwise the suburb picked from the list wins (the
 * class's own for an independent teacher, the studio's for a studio class),
 * then whatever its address names.
 */
function classSuburb(c: {
  format: string;
  suburb: string | null;
  location: string | null;
  studio: { suburb: string | null; address: string } | null;
}): string | null {
  if (c.format === "ONLINE") return null;
  return (
    findSuburb(c.suburb)?.name ??
    findSuburb(c.studio?.suburb)?.name ??
    (suburbFromAddress(c.location) ?? suburbFromAddress(c.studio?.address))?.name ??
    null
  );
}

/**
 * The suburbs that really have a studio, for the matcher's "Studio here"
 * badge. Read off live studios' addresses, so the badge appears where a
 * studio opens and disappears where one is suspended, instead of being a
 * fixed list in the page.
 */
export async function getStudioSuburbs(): Promise<string[]> {
  const studios = await db.studio.findMany({
    where: { suspendedAt: null },
    select: { address: true, suburb: true },
  });
  return [
    ...new Set(
      studios.flatMap((s) => {
        const at = findSuburb(s.suburb) ?? suburbFromAddress(s.address);
        return at ? [at.name] : [];
      }),
    ),
  ];
}

/** One class for the public detail page, with the same two counts. */
export async function getPublicClass(id: string) {
  const c = await db.danceClass.findUnique({
    where: { id },
    include: {
      host: {
        select: {
          name: true,
          displayName: true,
          avatarMark: true,
          avatarColor: true,
          teacherNote: true,
          photoId: true,
        },
      },
      studio: {
        select: {
          name: true,
          city: true,
          address: true,
          description: true,
          suspendedAt: true,
          arrive: true,
          photoId: true,
        },
      },
      teacherMember: {
        select: {
          name: true,
          user: { select: { teacherNote: true, photoId: true, displayName: true, name: true } },
        },
      },
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

  // Who teaches it: the studio's assigned teacher, or for an independent
  // class, its host. Their note to first-timers is the quote on the page.
  const teacherUser = c.teacherMember?.user ?? (c.studioId ? null : c.host);
  const teacherName = c.teacherMember
    ? c.teacherMember.user?.displayName?.trim() || c.teacherMember.name
    : c.host.displayName?.trim() || c.host.name;

  return {
    ...c,
    seatsTaken: c.bookings.length,
    firstTimersBooked: c.bookings.filter((b) => !veterans.has(b.userId)).length,
    hostName: c.host.displayName?.trim() || c.host.name,
    teacherName,
    teacherNote: teacherUser?.teacherNote ?? null,
    teacherPhotoUrl: imageUrl(teacherUser?.photoId),
    photoUrl: imageUrl(c.studio?.photoId),
  };
}

/**
 * Other beginner-friendly classes to offer next, nearest in time first.
 * Used after a booking and after a class, where the handoff offers "try this
 * next" cards. Same style first, then anything else a beginner can join.
 *
 * Same studio only, under the Studio Data Promise: StepUp never markets other
 * studios to a student because they booked with this one. For an independent
 * teacher's class, the same teacher's other classes.
 */
export async function getNextOptions(params: {
  excludeClassId: string;
  style: string;
  studioId: string | null;
  hostId: string;
  take?: number;
}) {
  const rows = await db.danceClass.findMany({
    where: {
      id: { not: params.excludeClassId },
      startTime: { gte: new Date() },
      cancelledAt: null,
      listing: { notIn: ["HIDDEN", "COURSE"] },
      kids: false,
      ...(params.studioId ? { studioId: params.studioId } : { hostId: params.hostId, studioId: null }),
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
