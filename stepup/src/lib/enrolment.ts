import { db } from "@/lib/db";
import { roleLimitsOf, stepupCapacity, withClassLock, SEAT_HOLDING } from "@/lib/booking";
import { fitsRole, isDanceRole, type DanceRole } from "@/lib/partner-roles";
import { cancellationOutcome, effectivePolicy } from "@/lib/policies";
import { prepayRequired, settleCancelledBooking } from "@/lib/cancellation";
import { logError } from "@/lib/logger";

export type EnrolResult =
  | { ok: true; enrolmentId: string; anchorBookingId: string; status: "ENROLLED" | "PENDING_PAYMENT" }
  | { ok: false; reason: string };

/**
 * Course enrolment: the whole term in one purchase. One booking per session,
 * all tied to the enrolment, and (for a paid course) one payment held on the
 * first session's booking. Enrolment closes when the course starts; after
 * that the class page points people at next term.
 */
export async function enrolInCourse(params: {
  userId: string;
  seriesId: string;
  role: DanceRole | null;
  note?: string | null;
}): Promise<EnrolResult> {
  const series = await db.classSeries.findUnique({
    where: { id: params.seriesId },
    select: {
      id: true,
      listing: true,
      coursePriceCents: true,
      startsOn: true,
      sessions: {
        where: { cancelledAt: null },
        orderBy: { startTime: "asc" },
        select: { id: true },
      },
    },
  });
  if (!series || series.listing !== "COURSE" || series.sessions.length === 0) {
    return { ok: false, reason: "Course not found." };
  }
  if (series.startsOn.getTime() <= Date.now()) {
    return { ok: false, reason: "This term has already started. Enrolments open again for next term." };
  }
  const anchorId = series.sessions[0].id;
  const paid = (series.coursePriceCents ?? 0) > 0;

  try {
    return await db.$transaction(
      (tx) =>
        withClassLock(tx, anchorId, async () => {
          const anchor = await tx.danceClass.findUniqueOrThrow({
            where: { id: anchorId },
            select: { capacity: true, stepupSpots: true, partnerRule: true, leadCap: true, followCap: true, balanceX: true },
          });
          const limits = roleLimitsOf(anchor);
          const role = params.role && isDanceRole(params.role) ? params.role : null;
          if (limits && !role) return { ok: false as const, reason: "Pick Lead, Follow or Either." };

          const existing = await tx.enrolment.findUnique({
            where: { userId_seriesId: { userId: params.userId, seriesId: series.id } },
          });
          if (existing && existing.status !== "CANCELLED") {
            return { ok: false as const, reason: "You're already enrolled in this course." };
          }

          const holders = await tx.booking.findMany({
            where: { classId: anchorId, status: { in: SEAT_HOLDING } },
            select: { role: true },
          });
          if (holders.length >= stepupCapacity(anchor)) return { ok: false as const, reason: "This course is full." };
          if (limits && role && !fitsRole(limits, holders.map((h) => h.role), role)) {
            return { ok: false as const, reason: `The course is full for ${role === "LEAD" ? "leads" : "follows"}. Try Either.` };
          }

          const status = paid ? "PENDING_PAYMENT" : "ENROLLED";
          const enrolment = existing
            ? await tx.enrolment.update({ where: { id: existing.id }, data: { status, cancelledAt: null } })
            : await tx.enrolment.create({ data: { userId: params.userId, seriesId: series.id, status } });

          const bookingStatus = paid ? "PENDING_PAYMENT" : "BOOKED";
          for (const s of series.sessions) {
            await tx.booking.upsert({
              where: { userId_classId: { userId: params.userId, classId: s.id } },
              create: {
                userId: params.userId,
                classId: s.id,
                status: bookingStatus,
                role,
                note: params.note?.trim().slice(0, 280) || null,
                enrolmentId: enrolment.id,
              },
              update: {
                status: bookingStatus,
                role,
                enrolmentId: enrolment.id,
                cancelledAt: null,
                waitlistPosition: null,
                bookedAt: new Date(),
              },
            });
          }
          const anchorBooking = await tx.booking.findUniqueOrThrow({
            where: { userId_classId: { userId: params.userId, classId: anchorId } },
            select: { id: true },
          });
          return { ok: true as const, enrolmentId: enrolment.id, anchorBookingId: anchorBooking.id, status };
        }),
      { timeout: 20_000 },
    );
  } catch (err) {
    logError("enrolment.failed", err, { seriesId: params.seriesId });
    return { ok: false, reason: "We couldn't enrol you just now. Try again." };
  }
}

/** Confirm (paid) or release (expired checkout) every session of an enrolment. */
export async function settleEnrolment(enrolmentId: string, paid: boolean) {
  await db.$transaction(async (tx) => {
    if (paid) {
      await tx.enrolment.updateMany({ where: { id: enrolmentId, status: "PENDING_PAYMENT" }, data: { status: "ENROLLED" } });
      await tx.booking.updateMany({ where: { enrolmentId, status: "PENDING_PAYMENT" }, data: { status: "BOOKED" } });
    } else {
      await tx.enrolment.updateMany({
        where: { id: enrolmentId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.booking.updateMany({
        where: { enrolmentId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
    }
  });
}

/**
 * Cancelling a course before it starts, under the studio's preset measured
 * from the first class. Once the course has started, the studio handles it.
 */
export async function cancelEnrolment(enrolmentId: string, userId: string) {
  const enrolment = await db.enrolment.findUnique({
    where: { id: enrolmentId },
    include: {
      bookings: { orderBy: { class: { startTime: "asc" } }, include: { class: true } },
      series: { select: { title: true, hostId: true, studioId: true, cancelPolicy: true, studio: { select: { cancelPolicy: true } } } },
    },
  });
  if (!enrolment || enrolment.userId !== userId || enrolment.status === "CANCELLED") {
    return { ok: false as const, reason: "Enrolment not found." };
  }
  const first = enrolment.bookings[0];
  if (!first || first.class.startTime.getTime() <= Date.now()) {
    return { ok: false as const, reason: "The course has started. Talk to the studio about changing your enrolment." };
  }
  const outcome =
    enrolment.status === "ENROLLED"
      ? cancellationOutcome({
          now: new Date(),
          start: first.class.startTime,
          policy: effectivePolicy(enrolment.series.cancelPolicy, enrolment.series.studio?.cancelPolicy),
          prepayRequired: await prepayRequired(userId, enrolment.series.hostId),
          movedSinceBooking: false,
        })
      : "FULL";

  await db.$transaction(async (tx) => {
    await tx.enrolment.update({ where: { id: enrolmentId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.booking.updateMany({
      where: { enrolmentId, status: { in: ["BOOKED", "PENDING_PAYMENT"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  });
  const money = await settleCancelledBooking(
    first.id,
    outcome,
    enrolment.series.hostId,
    enrolment.series.studioId,
    enrolment.series.title,
  );
  return { ok: true as const, outcome, ...money };
}
