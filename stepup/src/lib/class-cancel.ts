import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appUrl, sendClassCancelled } from "@/lib/email";
import { refundPayment } from "@/lib/stripe";
import { sendSms } from "@/lib/sms";
import { formatClassWhen, formatClassWhenLong } from "@/lib/time";
import { logError } from "@/lib/logger";

/**
 * Cancel a class: refund paid bookings (or give back credit), tell everyone
 * booked or waiting by email and SMS, and show them the same studio's other
 * classes first. Callers check who's asking; this does the work.
 */
export async function cancelClass(classId: string, reason?: string): Promise<boolean> {

  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    include: {
      studio: { select: { name: true } },
      host: { select: { name: true, displayName: true } },
      bookings: {
        where: { status: { in: ["BOOKED", "PENDING_PAYMENT", "WAITLISTED"] } },
        include: { user: { select: { email: true, name: true, phone: true } }, payment: true },
      },
    },
  });
  if (!danceClass || danceClass.cancelledAt) return false;

  await db.danceClass.update({
    where: { id: classId },
    data: { cancelledAt: new Date(), cancelledReason: reason?.slice(0, 280) || null },
  });

  await db.booking.updateMany({
    where: { classId, status: { in: ["BOOKED", "PENDING_PAYMENT", "WAITLISTED"] } },
    data: { status: "CANCELLED", cancelledAt: new Date(), waitlistPosition: null },
  });

  // Same studio first: the recovery offer is this studio's (or this
  // teacher's) own other classes, and nobody else's.
  const others = await db.danceClass.findMany({
    where: {
      id: { not: classId },
      startTime: { gte: new Date() },
      cancelledAt: null,
      listing: { notIn: ["HIDDEN", "COURSE"] },
      kids: false,
      ...(danceClass.studioId ? { studioId: danceClass.studioId } : { hostId: danceClass.hostId, studioId: null }),
    },
    orderBy: { startTime: "asc" },
    take: 3,
    select: { id: true, title: true, startTime: true, timezone: true },
  });
  const alternatives = others.map((o) => ({
    title: o.title,
    when: formatClassWhenLong(o.startTime, o.timezone),
    url: appUrl(`/first-class/${o.id}`),
  }));
  const hostName = danceClass.studio?.name ?? (danceClass.host.displayName?.trim() || danceClass.host.name);

  // Anyone who paid with credit gets the credit back.
  await db.studioCredit.updateMany({
    where: { usedByBookingId: { in: danceClass.bookings.map((b) => b.id) } },
    data: { usedAt: null, usedByBookingId: null },
  });

  for (const booking of danceClass.bookings) {
    // A course is paid for once, on its first session; one cancelled session
    // doesn't refund the whole course. The studio sorts that out.
    if (booking.payment?.status === "PAID" && !booking.enrolmentId) {
      await refundPayment(booking.payment.id).catch((err) =>
        logError("stripe.refund", err, { bookingId: booking.id })
      );
    }
    if (booking.status !== "WAITLISTED") {
      await sendSms(
        booking.user.phone,
        `${hostName}: ${danceClass.title}, ${formatClassWhen(danceClass.startTime, danceClass.timezone)}, is cancelled${reason ? ` (${reason})` : ""}. ${
          booking.payment?.status === "PAID" && !booking.enrolmentId ? "You'll get a full refund. " : ""
        }Our other classes: ${appUrl(others[0] ? `/first-class/${others[0].id}` : "/discover")}`,
      ).catch(() => false);
    }
    if (booking.user.email) {
      await sendClassCancelled({
        to: booking.user.email,
        name: booking.user.name,
        classTitle: danceClass.title,
        startTime: danceClass.startTime,
        timezone: danceClass.timezone,
        reason,
        refunded: booking.payment?.status === "PAID" && !booking.enrolmentId,
        alternatives,
        hostName,
      }).catch((err) => logError("email.classCancelled", err));
    }
  }

  revalidatePath("/discover");
  revalidatePath("/studio");
  revalidatePath("/teach");
  revalidatePath("/schedule");
  return true;
}
