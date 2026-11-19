import { db } from "@/lib/db";
import { releaseSeat, type Promoted } from "@/lib/booking";
import { refundPayment } from "@/lib/stripe";
import { appUrl, sendWaitlistPromoted } from "@/lib/email";
import { sendPlaceOffered } from "@/lib/email-studio";
import { logError } from "@/lib/logger";
import {
  CREDIT_VALID_DAYS,
  NO_SHOW_WINDOW_DAYS,
  cancellationOutcome,
  effectivePolicy,
  noShowStanding,
  type CancelOutcome,
} from "@/lib/policies";

/** A place offered off the waitlist for a paid class is held this long. */
export const OFFER_HOLD_HOURS = 12;

/** No-shows at this host (a studio's account, or an independent teacher) in the window. */
export async function noShowCount(userId: string, hostId: string, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - NO_SHOW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return db.booking.count({
    where: { userId, status: "NO_SHOW", noShowAt: { gte: since }, class: { hostId } },
  });
}

export async function prepayRequired(userId: string, hostId: string): Promise<boolean> {
  return noShowStanding(await noShowCount(userId, hostId)) === "PREPAY";
}

/** Tell people who came off a waitlist: confirmed, or held for them to pay. */
export async function notifyPromoted(promoted: Promoted[]): Promise<void> {
  for (const p of promoted) {
    const b = await db.booking.findUnique({
      where: { id: p.bookingId },
      select: {
        user: { select: { email: true, name: true } },
        class: { select: { id: true, title: true, startTime: true, timezone: true } },
      },
    });
    if (!b?.user.email) continue;
    const send =
      p.status === "BOOKED"
        ? sendWaitlistPromoted({
            to: b.user.email,
            name: b.user.name,
            classTitle: b.class.title,
            startTime: b.class.startTime,
            timezone: b.class.timezone,
          })
        : sendPlaceOffered({
            to: b.user.email,
            classTitle: b.class.title,
            startTime: b.class.startTime,
            timezone: b.class.timezone,
            payUrl: appUrl(`/first-class/${b.class.id}/book`),
            holdHours: OFFER_HOLD_HOURS,
          });
    await send.catch((err) => logError("email.waitlistPromoted", err));
  }
}

export type StudentCancelResult =
  | { ok: true; outcome: CancelOutcome; refunded: boolean; creditCents: number }
  | { ok: false; reason: string };

/**
 * A student cancelling their own booking, under the class's cancellation
 * preset: everything back before the cut-off (or after a venue change), then
 * credit, or nothing, as the preset says. The place goes to the next person
 * on the waitlist who fits.
 */
export async function cancelStudentBooking(bookingId: string, userId: string): Promise<StudentCancelResult> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      class: {
        select: {
          id: true,
          title: true,
          startTime: true,
          cancelPolicy: true,
          venueChangedAt: true,
          hostId: true,
          studioId: true,
          studio: { select: { cancelPolicy: true } },
        },
      },
    },
  });
  if (!b || b.userId !== userId) return { ok: false, reason: "Booking not found." };
  if (!["BOOKED", "WAITLISTED", "PENDING_PAYMENT"].includes(b.status)) {
    return { ok: false, reason: "This booking can't be cancelled." };
  }
  if (b.enrolmentId) {
    return { ok: false, reason: "This class is part of a course you enrolled in. Cancel the course enrolment instead." };
  }

  const now = new Date();
  const outcome =
    b.status === "BOOKED"
      ? cancellationOutcome({
          now,
          start: b.class.startTime,
          policy: effectivePolicy(b.class.cancelPolicy, b.class.studio?.cancelPolicy),
          prepayRequired: await prepayRequired(userId, b.class.hostId),
          movedSinceBooking: Boolean(b.class.venueChangedAt && b.class.venueChangedAt > b.bookedAt),
        })
      : "FULL";

  const { promoted } = await releaseSeat(bookingId);
  const money = await settleCancelledBooking(b.id, outcome, b.class.hostId, b.class.studioId, b.class.title);
  await notifyPromoted(promoted);
  return { ok: true, outcome, ...money };
}

/**
 * Money for a cancelled booking: a refund, credit, or nothing. A booking that
 * was itself paid with credit gets that credit back unless the outcome is
 * nothing.
 */
export async function settleCancelledBooking(
  bookingId: string,
  outcome: CancelOutcome,
  hostId: string,
  studioId: string | null,
  classTitle: string,
): Promise<{ refunded: boolean; creditCents: number }> {
  const [payment, usedCredit, booking] = await Promise.all([
    db.payment.findUnique({ where: { bookingId } }),
    db.studioCredit.findUnique({ where: { usedByBookingId: bookingId } }),
    db.booking.findUnique({ where: { id: bookingId }, select: { userId: true } }),
  ]);
  if (!booking) return { refunded: false, creditCents: 0 };

  if (usedCredit) {
    if (outcome !== "NONE") {
      await db.studioCredit.update({ where: { id: usedCredit.id }, data: { usedAt: null, usedByBookingId: null } });
      return { refunded: false, creditCents: usedCredit.amountCents };
    }
    return { refunded: false, creditCents: 0 };
  }

  if (payment?.status !== "PAID") return { refunded: false, creditCents: 0 };
  if (outcome === "FULL") {
    try {
      await refundPayment(payment.id);
      return { refunded: true, creditCents: 0 };
    } catch (err) {
      logError("stripe.refund", err, { bookingId });
      return { refunded: false, creditCents: 0 };
    }
  }
  if (outcome === "CREDIT") {
    await db.studioCredit.create({
      data: {
        userId: booking.userId,
        hostId,
        studioId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        reason: `Late cancellation: ${classTitle}`,
        fromBookingId: bookingId,
        expiresAt: new Date(Date.now() + CREDIT_VALID_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { refunded: false, creditCents: payment.amountCents };
  }
  return { refunded: false, creditCents: 0 };
}

/** An unused, unexpired credit with this host that covers this price. */
export async function usableCredit(userId: string, hostId: string, priceCents: number) {
  if (priceCents <= 0) return null;
  return db.studioCredit.findFirst({
    where: {
      userId,
      hostId,
      usedAt: null,
      expiresAt: { gt: new Date() },
      amountCents: { gte: priceCents },
    },
    orderBy: { expiresAt: "asc" },
  });
}

/** Mark a credit as spent on a booking, once. False if it was taken meanwhile. */
export async function spendCredit(creditId: string, bookingId: string): Promise<boolean> {
  const { count } = await db.studioCredit.updateMany({
    where: { id: creditId, usedAt: null },
    data: { usedAt: new Date(), usedByBookingId: bookingId },
  });
  return count === 1;
}
