import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

export type BookingOutcome =
  | { ok: true; status: "BOOKED"; bookingId: string }
  | { ok: true; status: "WAITLISTED"; bookingId: string; position: number }
  | { ok: true; status: "PENDING_PAYMENT"; bookingId: string }
  | { ok: false; reason: string };

/** Statuses that occupy a seat in the class. */
const SEAT_HOLDING = ["BOOKED", "ATTENDED", "PENDING_PAYMENT"];

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
async function withClassLock<T>(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  classId: string,
  fn: () => Promise<T>
): Promise<T> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${classId}))`;
  return fn();
}

/**
 * Reserves a seat atomically.
 *
 * The naive version — count bookings, compare to capacity, then insert — is a
 * time-of-check/time-of-use race: two people tapping "Book" on the last seat
 * both read the same count and both get in.
 *
 * When the class is full the booking is recorded as WAITLISTED instead, and is
 * promoted automatically if someone cancels.
 */
export async function reserveSeat(params: {
  userId: string;
  classId: string;
  requiresPayment: boolean;
  allowWaitlist?: boolean;
}): Promise<BookingOutcome> {
  const { userId, classId, requiresPayment, allowWaitlist = true } = params;

  const attempt = async (): Promise<BookingOutcome> =>
    db.$transaction(
      async (tx) =>
        withClassLock(tx, classId, async () => {
        const danceClass = await tx.danceClass.findUnique({
          where: { id: classId },
          select: {
            id: true,
            capacity: true,
            startTime: true,
            cancelledAt: true,
          },
        });

        if (!danceClass) return { ok: false, reason: "Class not found." };
        if (danceClass.cancelledAt) {
          return { ok: false, reason: "This class has been cancelled." };
        }
        if (danceClass.startTime < new Date()) {
          return { ok: false, reason: "This class has already started." };
        }

        const existing = await tx.booking.findUnique({
          where: { userId_classId: { userId, classId } },
        });
        if (existing && existing.status !== "CANCELLED") {
          return { ok: false, reason: "You're already booked for this class." };
        }

        const taken = await tx.booking.count({
          where: { classId, status: { in: SEAT_HOLDING } },
        });

        const isFull = taken >= danceClass.capacity;
        if (isFull && !allowWaitlist) {
          return { ok: false, reason: "This class is full." };
        }

        let status: string;
        let waitlistPosition: number | null = null;

        if (isFull) {
          const waiting = await tx.booking.count({
            where: { classId, status: "WAITLISTED" },
          });
          status = "WAITLISTED";
          waitlistPosition = waiting + 1;
        } else {
          status = requiresPayment ? "PENDING_PAYMENT" : "BOOKED";
        }

        // A previously cancelled booking is revived rather than duplicated,
        // because (userId, classId) is unique.
        const booking = existing
          ? await tx.booking.update({
              where: { id: existing.id },
              data: {
                status,
                waitlistPosition,
                bookedAt: new Date(),
                cancelledAt: null,
              },
            })
          : await tx.booking.create({
              data: { userId, classId, status, waitlistPosition },
            });

        if (status === "WAITLISTED") {
          return {
            ok: true,
            status: "WAITLISTED",
            bookingId: booking.id,
            position: waitlistPosition!,
          };
        }
        return {
          ok: true,
          status: status as "BOOKED" | "PENDING_PAYMENT",
          bookingId: booking.id,
        };
        }),
      // Waiting on the advisory lock counts toward the transaction timeout, so
      // allow headroom for a burst of people booking the same class at once.
      { timeout: 15_000 }
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
        return {
          ok: false,
          reason: "Couldn't reserve a spot, please try again.",
        };
      }
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }

  return { ok: false, reason: "Couldn't reserve a spot, please try again." };
}

/**
 * Releases a seat and promotes the next person off the waitlist, if any.
 * Returns the promoted booking so the caller can notify them.
 */
export async function releaseSeat(bookingId: string): Promise<{
  promoted: { bookingId: string; userId: string } | null;
}> {
  return db.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          classId: true,
          status: true,
          waitlistPosition: true,
        },
      });
      if (!booking) return { promoted: null };

      return withClassLock(tx, booking.classId, async () => {
        const wasHoldingSeat = SEAT_HOLDING.includes(booking.status);
        const vacatedPosition = booking.waitlistPosition;

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            waitlistPosition: null,
          },
        });

        if (!wasHoldingSeat) {
          // They were on the waitlist. Close the gap by shifting up only the
          // people *behind* them — decrementing everyone would push the person
          // at position 1 down to 0.
          if (vacatedPosition !== null) {
            await tx.$executeRaw`
              UPDATE "Booking"
              SET "waitlistPosition" = "waitlistPosition" - 1
              WHERE "classId" = ${booking.classId}
                AND "status" = 'WAITLISTED'
                AND "waitlistPosition" > ${vacatedPosition}
            `;
          }
          return { promoted: null };
        }

        const danceClass = await tx.danceClass.findUnique({
          where: { id: booking.classId },
          select: { capacity: true },
        });
        if (!danceClass) return { promoted: null };

        const taken = await tx.booking.count({
          where: { classId: booking.classId, status: { in: SEAT_HOLDING } },
        });
        if (taken >= danceClass.capacity) return { promoted: null };

        const next = await tx.booking.findFirst({
          where: { classId: booking.classId, status: "WAITLISTED" },
          orderBy: { waitlistPosition: "asc" },
        });
        if (!next) return { promoted: null };

        const promotedFrom = next.waitlistPosition;

        await tx.booking.update({
          where: { id: next.id },
          data: { status: "BOOKED", waitlistPosition: null },
        });

        if (promotedFrom !== null) {
          await tx.$executeRaw`
            UPDATE "Booking"
            SET "waitlistPosition" = "waitlistPosition" - 1
            WHERE "classId" = ${booking.classId}
              AND "status" = 'WAITLISTED'
              AND "waitlistPosition" > ${promotedFrom}
          `;
        }

        return { promoted: { bookingId: next.id, userId: next.userId } };
      });
    },
    { timeout: 15_000 }
  );
}

export async function countSeats(classId: string) {
  const [taken, waitlisted] = await Promise.all([
    db.booking.count({ where: { classId, status: { in: SEAT_HOLDING } } }),
    db.booking.count({ where: { classId, status: "WAITLISTED" } }),
  ]);
  return { taken, waitlisted };
}
