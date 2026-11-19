import { db } from "@/lib/db";
import { logError } from "@/lib/logger";
import { seatsForRegulars } from "@/lib/first-timer-spots";
import {
  fitsRole,
  isDanceRole,
  isPartnerRule,
  nextFromWaitlist,
  type DanceRole,
  type RoleLimits,
} from "@/lib/partner-roles";

export type BookingOutcome =
  | { ok: true; status: "BOOKED"; bookingId: string; promoted: Promoted[] }
  | { ok: true; status: "WAITLISTED"; bookingId: string; position: number; promoted: Promoted[] }
  | { ok: true; status: "PENDING_PAYMENT"; bookingId: string; promoted: Promoted[] }
  | { ok: false; reason: string };

/** Someone moved off a waitlist, so the caller can tell them. */
export type Promoted = { bookingId: string; userId: string; status: "BOOKED" | "PENDING_PAYMENT" };

/** Statuses that occupy a seat in the class. */
export const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Serializes concurrent work on one class by taking a Postgres advisory lock
 * for the transaction's lifetime.
 *
 * Serializable isolation also prevents the race, but makes losing transactions
 * *abort* (SQLSTATE 40001), so under a burst of bookings some real users get an
 * error instead of a seat. An advisory lock makes them queue briefly instead,
 * which is the behaviour a booking flow actually wants. The lock is scoped to
 * the class id, so bookings for different classes never block each other, and
 * Postgres releases it automatically at commit or rollback.
 */
export async function withClassLock<T>(tx: Tx, classId: string, fn: () => Promise<T>): Promise<T> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${classId}))`;
  return fn();
}

/** How many places StepUp may sell: the studio keeps the rest for pass holders. */
export function stepupCapacity(c: { capacity: number; stepupSpots: number | null }): number {
  return c.stepupSpots && c.stepupSpots > 0 ? Math.min(c.capacity, c.stepupSpots) : c.capacity;
}

export function roleLimitsOf(c: {
  partnerRule: string | null;
  leadCap: number | null;
  followCap: number | null;
  balanceX: number | null;
}): RoleLimits | null {
  if (!isPartnerRule(c.partnerRule)) return null;
  return { rule: c.partnerRule, leadCap: c.leadCap, followCap: c.followCap, balanceX: c.balanceX };
}

const CLASS_FOR_SEATS = {
  id: true,
  capacity: true,
  stepupSpots: true,
  startTime: true,
  cancelledAt: true,
  firstTimerSpots: true,
  listing: true,
  kids: true,
  partnerRule: true,
  leadCap: true,
  followCap: true,
  balanceX: true,
  priceCents: true,
  studioId: true,
  hostId: true,
  studio: { select: { name: true } },
} as const;

type SeatClass = {
  capacity: number;
  stepupSpots: number | null;
  firstTimerSpots: number | null;
  partnerRule: string | null;
  leadCap: number | null;
  followCap: number | null;
  balanceX: number | null;
  priceCents: number;
};

/** Who holds the room now, and what roles they dance (walk-ins included). */
async function roomState(tx: Tx, classId: string) {
  const [holders, walkIns] = await Promise.all([
    tx.booking.findMany({
      where: { classId, status: { in: SEAT_HOLDING } },
      select: { userId: true, role: true },
    }),
    tx.walkIn.findMany({ where: { classId }, select: { role: true } }),
  ]);
  const regularHolders = holders.length
    ? new Set(
        (
          await tx.booking.findMany({
            where: { userId: { in: holders.map((h) => h.userId) }, status: "ATTENDED" },
            distinct: ["userId"],
            select: { userId: true },
          })
        ).map((r) => r.userId),
      )
    : new Set<string>();
  return {
    taken: holders.length,
    firstTimersHolding: holders.filter((h) => !regularHolders.has(h.userId)).length,
    roles: [...holders.map((h) => h.role), ...walkIns.map((w) => w.role)],
  };
}

async function isRegular(tx: Tx, userId: string): Promise<boolean> {
  return (
    (await tx.booking.findFirst({ where: { userId, status: "ATTENDED" }, select: { id: true } })) !== null
  );
}

/** Is there a place for this person, in this role, right now? */
function hasRoom(
  c: SeatClass,
  room: Awaited<ReturnType<typeof roomState>>,
  regular: boolean,
  role: DanceRole | null,
): boolean {
  const cap = stepupCapacity(c);
  const forThem = regular ? seatsForRegulars(cap, c.firstTimerSpots, room.firstTimersHolding) : cap;
  if (room.taken >= forThem) return false;
  const limits = roleLimitsOf(c);
  if (limits && role && !fitsRole(limits, room.roles, role)) return false;
  return true;
}

/**
 * Moves people off the waitlist while there's room for them, each in turn
 * the first in the queue whose role now fits. Called after anything that can
 * open a place: a cancellation, or a booking or walk-in on the side that was
 * short. A free class confirms them; a paid one holds the place for them to
 * pay for.
 */
export async function promoteWaitlist(tx: Tx, classId: string): Promise<Promoted[]> {
  const c = await tx.danceClass.findUnique({ where: { id: classId }, select: CLASS_FOR_SEATS });
  if (!c || c.cancelledAt || c.startTime < new Date()) return [];

  const promoted: Promoted[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const waiting = await tx.booking.findMany({
      where: { classId, status: "WAITLISTED" },
      orderBy: [{ waitlistPosition: "asc" }, { bookedAt: "asc" }],
      select: { id: true, userId: true, role: true },
    });
    if (waiting.length === 0) break;

    const room = await roomState(tx, classId);
    const limits = roleLimitsOf(c);
    const fitting = waiting.filter((w) => hasRoomQuick(c, room, w.role));
    const candidate = nextFromWaitlist(limits, room.roles, fitting);
    if (!candidate) break;
    if (!hasRoom(c, room, await isRegular(tx, candidate.userId), isDanceRole(candidate.role) ? candidate.role : null)) {
      // A regular can't take a place kept for first-timers; try whoever is
      // next among first-timers instead.
      const firstTimer = await firstFittingFirstTimer(tx, c, room, fitting.filter((w) => w.id !== candidate.id));
      if (!firstTimer) break;
      promoted.push(await promoteOne(tx, classId, firstTimer, c.priceCents > 0));
      continue;
    }
    promoted.push(await promoteOne(tx, classId, candidate, c.priceCents > 0));
  }
  return promoted;
}

function hasRoomQuick(c: SeatClass, room: Awaited<ReturnType<typeof roomState>>, role: string | null) {
  if (room.taken >= stepupCapacity(c)) return false;
  const limits = roleLimitsOf(c);
  return !limits || fitsRole(limits, room.roles, isDanceRole(role) ? role : "EITHER");
}

async function firstFittingFirstTimer(
  tx: Tx,
  c: SeatClass,
  room: Awaited<ReturnType<typeof roomState>>,
  waiting: { id: string; userId: string; role: string | null }[],
) {
  for (const w of waiting) {
    if (!(await isRegular(tx, w.userId)) && hasRoom(c, room, false, isDanceRole(w.role) ? w.role : null)) return w;
  }
  return null;
}

async function promoteOne(
  tx: Tx,
  classId: string,
  w: { id: string; userId: string },
  paid: boolean,
): Promise<Promoted> {
  const status = paid ? "PENDING_PAYMENT" : "BOOKED";
  // bookedAt restarts: a held place for a paid class lapses if unpaid.
  await tx.booking.update({
    where: { id: w.id },
    data: { status, waitlistPosition: null, bookedAt: new Date() },
  });
  await renumberWaitlist(tx, classId);
  return { bookingId: w.id, userId: w.userId, status };
}

async function renumberWaitlist(tx: Tx, classId: string) {
  const rest = await tx.booking.findMany({
    where: { classId, status: "WAITLISTED" },
    orderBy: [{ waitlistPosition: "asc" }, { bookedAt: "asc" }],
    select: { id: true, waitlistPosition: true },
  });
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].waitlistPosition !== i + 1) {
      await tx.booking.update({ where: { id: rest[i].id }, data: { waitlistPosition: i + 1 } });
    }
  }
}

/**
 * Reserves a seat atomically.
 *
 * The naive version (count bookings, compare to capacity, then insert) is a
 * time-of-check/time-of-use race: two people tapping "Book" on the last seat
 * both read the same count and both get in.
 *
 * When there's no place for them (the class is full, the places left are
 * kept for first-timers, or their side of a partner class is full) the
 * booking goes on that role's waitlist instead.
 */
export async function reserveSeat(params: {
  userId: string;
  classId: string;
  requiresPayment: boolean;
  allowWaitlist?: boolean;
  role?: DanceRole | null;
  note?: string | null;
}): Promise<BookingOutcome> {
  const { userId, classId, requiresPayment, allowWaitlist = true } = params;

  const attempt = async (): Promise<BookingOutcome> =>
    db.$transaction(
      async (tx) =>
        withClassLock(tx, classId, async () => {
          const c = await tx.danceClass.findUnique({ where: { id: classId }, select: CLASS_FOR_SEATS });

          if (!c) return { ok: false, reason: "Class not found." };
          if (c.cancelledAt) return { ok: false, reason: "This class has been cancelled." };
          if (c.startTime < new Date()) return { ok: false, reason: "This class has already started." };
          if (c.listing === "HIDDEN") return { ok: false, reason: "This class isn't booked through StepUp." };
          if (c.listing === "COURSE") {
            return { ok: false, reason: "This class is part of a course. Enrol in the whole course instead." };
          }
          if (c.kids) {
            return {
              ok: false,
              reason: "Kids' classes are booked by a parent or guardian, which isn't open on StepUp yet. Contact the studio to enrol.",
            };
          }

          const limits = roleLimitsOf(c);
          const role = params.role && isDanceRole(params.role) ? params.role : null;
          if (limits && !role) return { ok: false, reason: "Pick Lead, Follow or Either." };

          if (c.listing === "TRIAL") {
            const before = await tx.booking.findFirst({
              where: {
                userId,
                classId: { not: classId },
                status: { not: "CANCELLED" },
                class: c.studioId ? { studioId: c.studioId } : { hostId: c.hostId, studioId: null },
              },
              select: { id: true },
            });
            if (before) {
              return {
                ok: false,
                reason: `Trial classes are a free first visit, one per person${c.studio ? ` at ${c.studio.name}` : ""}, and you've been before.`,
              };
            }
          }

          const existing = await tx.booking.findUnique({
            where: { userId_classId: { userId, classId } },
          });
          if (existing && existing.status !== "CANCELLED") {
            return { ok: false, reason: "You're already booked for this class." };
          }

          const room = await roomState(tx, classId);
          const roomOk = hasRoom(c, room, await isRegular(tx, userId), role);
          if (!roomOk && !allowWaitlist) return { ok: false, reason: "This class is full." };

          let status: string;
          let waitlistPosition: number | null = null;
          if (!roomOk) {
            const waiting = await tx.booking.count({ where: { classId, status: "WAITLISTED" } });
            status = "WAITLISTED";
            waitlistPosition = waiting + 1;
          } else {
            status = requiresPayment ? "PENDING_PAYMENT" : "BOOKED";
          }

          const data = {
            status,
            waitlistPosition,
            role,
            note: params.note?.trim().slice(0, 280) || null,
          };
          // A previously cancelled booking is revived rather than duplicated,
          // because (userId, classId) is unique.
          const booking = existing
            ? await tx.booking.update({
                where: { id: existing.id },
                data: { ...data, bookedAt: new Date(), cancelledAt: null, noShowAt: null },
              })
            : await tx.booking.create({ data: { ...data, userId, classId } });

          // A lead booking into a class that was short of leads can make room
          // for a follow who was waiting, and the other way round.
          const promoted = status !== "WAITLISTED" && limits ? await promoteWaitlist(tx, classId) : [];

          if (status === "WAITLISTED") {
            return { ok: true, status: "WAITLISTED", bookingId: booking.id, position: waitlistPosition!, promoted };
          }
          return { ok: true, status: status as "BOOKED" | "PENDING_PAYMENT", bookingId: booking.id, promoted };
        }),
      // Waiting on the advisory lock counts toward the transaction timeout, so
      // allow headroom for a burst of people booking the same class at once.
      { timeout: 15_000 },
    );

  // The advisory lock removes serialization aborts, but a genuinely
  // simultaneous insert can still trip the (userId, classId) unique index.
  // Retry briefly rather than surfacing a database error to the user.
  for (let i = 0; i < 3; i++) {
    try {
      return await attempt();
    } catch (err) {
      const code = (err as { code?: string }).code;
      const isRetryable =
        code === "P2034" || // Prisma: transaction conflict / write conflict
        code === "40001" || // Postgres: serialization failure
        code === "P2002"; // unique violation from a concurrent insert
      if (!isRetryable || i === 2) {
        logError("booking.reserveFailed", err, { userId, classId });
        return { ok: false, reason: "Couldn't reserve a spot, please try again." };
      }
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }

  return { ok: false, reason: "Couldn't reserve a spot, please try again." };
}

/**
 * Releases a seat (or a waitlist place) and moves the next people who fit off
 * the waitlist. Returns who was promoted so the caller can tell them.
 */
export async function releaseSeat(bookingId: string): Promise<{ promoted: Promoted[] }> {
  return db.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, classId: true, status: true },
      });
      if (!booking) return { promoted: [] };

      return withClassLock(tx, booking.classId, async () => {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED", cancelledAt: new Date(), waitlistPosition: null },
        });
        await renumberWaitlist(tx, booking.classId);
        if (!SEAT_HOLDING.includes(booking.status)) return { promoted: [] };
        return { promoted: await promoteWaitlist(tx, booking.classId) };
      });
    },
    { timeout: 15_000 },
  );
}

/** Promote whoever now fits, outside any other transaction (walk-ins, expiries). */
export async function promoteNow(classId: string): Promise<Promoted[]> {
  return db.$transaction((tx) => withClassLock(tx, classId, () => promoteWaitlist(tx, classId)), {
    timeout: 15_000,
  });
}

export async function countSeats(classId: string) {
  const [taken, waitlisted] = await Promise.all([
    db.booking.count({ where: { classId, status: { in: SEAT_HOLDING } } }),
    db.booking.count({ where: { classId, status: "WAITLISTED" } }),
  ]);
  return { taken, waitlisted };
}
