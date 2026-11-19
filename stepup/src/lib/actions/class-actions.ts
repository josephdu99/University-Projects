"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { recordAttendance, type AwardedBadge } from "@/lib/gamification";
import { reserveSeat } from "@/lib/booking";
import { checkExtras, extrasFromForm, applyExtras } from "@/lib/booking-extras";
import { cancelStudentBooking, notifyPromoted, spendCredit, usableCredit } from "@/lib/cancellation";
import { cancelEnrolment, enrolInCourse } from "@/lib/enrolment";
import { requireRole, requireUser } from "@/lib/session";
import { CLASS_FORMATS, DANCE_LEVELS } from "@/lib/roles";
import {
  zonedDateTimeToUtc,
  formatClassWhenLong,
  isValidTimeZone,
  addDaysToDateString,
  dayOfWeekInTimeZone,
  DEFAULT_TIMEZONE,
} from "@/lib/time";
import { createCheckoutSession, refundPayment } from "@/lib/stripe";
import { appUrl, sendBookingConfirmation, sendClassCancelled } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { canManageClass } from "@/lib/studio-access";
import { logError } from "@/lib/logger";

export type ActionState = { error?: string; success?: string } | undefined;

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookState =
  | { error: string }
  | { success: true; status: "BOOKED" | "WAITLISTED"; position?: number; paidWithCredit?: boolean }
  | undefined;

/**
 * A signed-in dancer booking a class (or enrolling in a course). The same
 * extras every booking needs are checked here: a role for a partner class,
 * the studio's current terms, a mobile. A credit at the studio that covers
 * the price pays for it instead of a card.
 */
export async function bookClassAction(
  _prev: BookState,
  formData: FormData
): Promise<BookState> {
  const user = await requireRole("STUDENT");
  const classId = formData.get("classId");
  if (typeof classId !== "string") return { error: "Missing class." };

  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      priceCents: true,
      currency: true,
      hostId: true,
      studioId: true,
      seriesId: true,
      listing: true,
      partnerRule: true,
      series: { select: { coursePriceCents: true } },
      host: { select: { payoutAccount: { select: { stripeAccountId: true, chargesEnabled: true } } } },
    },
  });
  if (!danceClass) return { error: "Class not found." };

  const extras = await checkExtras(user.id, danceClass, extrasFromForm(formData));
  if (!extras.ok) return { error: extras.error };

  // ── A course: the whole term in one purchase.
  if (danceClass.listing === "COURSE" && danceClass.seriesId) {
    const price = danceClass.series?.coursePriceCents ?? 0;
    if (price > 0 && !danceClass.host.payoutAccount?.chargesEnabled) {
      return { error: "This studio isn't set up to take payments yet. Try again later." };
    }
    const enrol = await enrolInCourse({
      userId: user.id,
      seriesId: danceClass.seriesId,
      role: extras.value.role,
      note: extras.value.note,
    });
    if (!enrol.ok) return { error: enrol.reason };
    await applyExtras(user.id, extras.value);
    revalidatePath(`/first-class/${classId}`);
    if (enrol.status === "PENDING_PAYMENT") {
      const url = await createCheckoutSession({
        bookingId: enrol.anchorBookingId,
        classId,
        classTitle: `${danceClass.title} (whole course)`,
        amountCents: price,
        currency: danceClass.currency,
        destinationAccountId: danceClass.host.payoutAccount!.stripeAccountId,
        customerEmail: user.email ?? undefined,
        enrolmentId: enrol.enrolmentId,
        successPath: `/first-class/${classId}/booked`,
        cancelPath: `/first-class/${classId}/book`,
      });
      redirect(url);
    }
    return { success: true, status: "BOOKED" };
  }

  const isPaid = danceClass.priceCents > 0;
  const credit = isPaid ? await usableCredit(user.id, danceClass.hostId, danceClass.priceCents) : null;

  if (isPaid && !credit && !danceClass.host.payoutAccount?.chargesEnabled) {
    return {
      error: "This host isn't set up to take payments yet. Try again later.",
    };
  }

  const outcome = await reserveSeat({
    userId: user.id,
    classId,
    requiresPayment: isPaid && !credit,
    role: extras.value.role,
    note: extras.value.note,
  });

  if (!outcome.ok) return { error: outcome.reason };
  await applyExtras(user.id, extras.value);
  await notifyPromoted(outcome.promoted);

  let paidWithCredit = false;
  if (credit && outcome.status === "BOOKED") paidWithCredit = await spendCredit(credit.id, outcome.bookingId);

  revalidatePath("/discover");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${classId}`);
  revalidatePath(`/first-class/${classId}`);

  if (outcome.status === "WAITLISTED") {
    return { success: true, status: "WAITLISTED", position: outcome.position };
  }

  if (outcome.status === "PENDING_PAYMENT") {
    // Hand off to Stripe; the booking is confirmed by the webhook on success.
    const url = await createCheckoutSession({
      bookingId: outcome.bookingId,
      classId: danceClass.id,
      classTitle: danceClass.title,
      amountCents: danceClass.priceCents,
      currency: danceClass.currency,
      destinationAccountId: danceClass.host.payoutAccount!.stripeAccountId,
      customerEmail: user.email ?? undefined,
    });
    redirect(url);
  }

  await sendBookingConfirmation({
    to: user.email!,
    name: user.name ?? "there",
    classTitle: danceClass.title,
    startTime: danceClass.startTime,
    timezone: danceClass.timezone,
  }).catch((err) => logError("email.bookingConfirmation", err));

  return { success: true, status: "BOOKED", paidWithCredit };
}

/**
 * Pay for a place held for you: one offered off the waitlist of a paid class,
 * or a checkout you backed out of.
 */
export async function payPendingAction(bookingId: string): Promise<void> {
  const user = await requireUser();
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      class: {
        select: {
          id: true,
          title: true,
          priceCents: true,
          currency: true,
          host: { select: { payoutAccount: { select: { stripeAccountId: true, chargesEnabled: true } } } },
        },
      },
    },
  });
  if (!booking || booking.userId !== user.id || booking.status !== "PENDING_PAYMENT" || booking.enrolmentId) return;
  const account = booking.class.host.payoutAccount;
  if (!account?.chargesEnabled || booking.class.priceCents <= 0) return;
  const url = await createCheckoutSession({
    bookingId: booking.id,
    classId: booking.class.id,
    classTitle: booking.class.title,
    amountCents: booking.class.priceCents,
    currency: booking.class.currency,
    destinationAccountId: account.stripeAccountId,
    customerEmail: user.email ?? undefined,
    successPath: `/first-class/${booking.class.id}/booked`,
    cancelPath: `/first-class/${booking.class.id}/book`,
  });
  redirect(url);
}

export type CancelBookingState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

/** A dancer cancelling their own booking, under the class's preset. */
export async function cancelBookingAction(bookingId: string): Promise<void> {
  const user = await requireUser();
  const result = await cancelStudentBooking(bookingId, user.id);
  if (!result.ok) return;
  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { classId: true } });
  revalidatePath("/discover");
  revalidatePath("/schedule");
  if (booking) {
    revalidatePath(`/classes/${booking.classId}`);
    revalidatePath(`/first-class/${booking.classId}`);
    redirect(`/classes/${booking.classId}?cancelled=${result.outcome.toLowerCase()}`);
  }
}

/** Cancel a whole course enrolment, before the course starts. */
export async function cancelEnrolmentAction(enrolmentId: string): Promise<void> {
  const user = await requireUser();
  const result = await cancelEnrolment(enrolmentId, user.id);
  revalidatePath("/schedule");
  if (result.ok) redirect(`/schedule?course=${result.outcome.toLowerCase()}`);
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendState =
  | { error: string }
  | { success: true; points: number; newBadges: AwardedBadge[] }
  | undefined;

/**
 * Students claim attendance for an online class by entering the short code the
 * host reveals during the session. This replaces blind self-reporting, which
 * let anyone book every online class and farm points without showing up.
 */
export async function claimAttendanceAction(
  _prev: AttendState,
  formData: FormData
): Promise<AttendState> {
  const user = await requireUser();
  const bookingId = formData.get("bookingId");
  const code = formData.get("code");

  if (typeof bookingId !== "string") return { error: "Missing booking." };
  if (typeof code !== "string" || code.trim().length === 0) {
    return { error: "Enter the code your instructor gave you." };
  }

  // Stop code-guessing: a 6-character code is brute-forceable otherwise.
  const limit = await checkRateLimit(`checkin:${user.id}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { class: true },
  });
  if (!booking || booking.userId !== user.id) {
    return { error: "Booking not found." };
  }
  if (booking.class.cancelledAt) return { error: "This class was cancelled." };
  if (booking.class.startTime > new Date()) {
    return { error: "This class hasn't started yet." };
  }
  if (!booking.class.checkInCode) {
    return { error: "Your instructor hasn't opened check-in yet." };
  }
  if (
    booking.class.checkInCode.toUpperCase() !== code.trim().toUpperCase()
  ) {
    return { error: "That code doesn't match. Double-check with your instructor." };
  }

  const result = await recordAttendance(bookingId);
  if (!result.ok) return { error: result.reason };

  revalidatePath("/schedule");
  revalidatePath("/profile");
  revalidatePath("/leaderboard");

  if (result.alreadyAttended) {
    return { error: "You've already checked in for this class." };
  }
  return { success: true, points: result.points, newBadges: result.newBadges };
}

/** Host marks a student present from the roster. */
export async function checkInStudentAction(bookingId: string): Promise<void> {
  const user = await requireUser();
  if (!["STUDIO_OWNER", "INSTRUCTOR", "ADMIN"].includes(user.role)) return;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { class: { select: { hostId: true, studioId: true, id: true } } },
  });
  if (!booking) return;
  if (!(await canManageClass(user, booking.class))) return;

  const result = await recordAttendance(bookingId);
  if (!result.ok) logError("attendance.checkIn", new Error(result.reason), { bookingId });

  revalidatePath(`/studio/classes/${booking.classId}`);
  revalidatePath(`/teach/classes/${booking.classId}`);
}

/** Host opens check-in, generating the code students enter. */
export async function openCheckInAction(classId: string): Promise<void> {
  const user = await requireUser();

  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    select: { hostId: true, studioId: true },
  });
  if (!danceClass || !(await canManageClass(user, danceClass))) return;

  // Unambiguous alphabet: no O/0 or I/1 to mistype.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");

  await db.danceClass.update({
    where: { id: classId },
    data: { checkInCode: code, checkInCodeSetAt: new Date() },
  });

  revalidatePath(`/studio/classes/${classId}`);
  revalidatePath(`/teach/classes/${classId}`);
}

// ─── Class creation & management ─────────────────────────────────────────────

const classFormSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80),
  style: z.string().trim().min(2, "Add a dance style").max(40),
  description: z.string().trim().min(3, "Add a short description").max(400),
  format: z.enum(CLASS_FORMATS),
  level: z.enum(DANCE_LEVELS),
  location: z.string().trim().max(160).optional(),
  onlineLink: z.string().trim().max(300).optional(),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  timezone: z.string().optional(),
  durationMin: z.coerce.number().int().min(15).max(240),
  capacity: z.coerce.number().int().min(1).max(500),
  points: z.coerce.number().int().min(5).max(200),
  priceDollars: z.coerce.number().min(0).max(1000).optional(),
  // Recurring options
  repeatWeekly: z.coerce.boolean().optional(),
  repeatWeeks: z.coerce.number().int().min(1).max(52).optional(),
});

export type CreateClassState =
  | { error: string }
  | { success: true; created: number }
  | undefined;

async function hostContext(userId: string, role: string) {
  if (role === "STUDIO_OWNER") {
    const studio = await db.studio.findUnique({ where: { ownerId: userId } });
    if (!studio) return null;
    return {
      studioId: studio.id,
      timezone: studio.timezone,
      fallbackLocation: `${studio.address}, ${studio.city}`,
    };
  }
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  return { studioId: null, timezone: user.timezone, fallbackLocation: null };
}

export async function createClassAction(
  _prev: CreateClassState,
  formData: FormData
): Promise<CreateClassState> {
  const user = await requireUser();
  if (!["STUDIO_OWNER", "INSTRUCTOR"].includes(user.role)) {
    return { error: "Only studios and instructors can create classes." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = classFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  const ctx = await hostContext(user.id, user.role);
  if (!ctx) return { error: "Studio profile not found." };

  const timezone =
    data.timezone && isValidTimeZone(data.timezone)
      ? data.timezone
      : ctx.timezone || DEFAULT_TIMEZONE;

  // Interpret the entered wall-clock time in the host's zone, not the server's.
  const startTime = zonedDateTimeToUtc(data.date, data.time, timezone);
  if (Number.isNaN(startTime.getTime())) {
    return { error: "Enter a valid date and time." };
  }
  if (startTime < new Date()) {
    return { error: "Pick a time in the future." };
  }

  const format = user.role === "INSTRUCTOR" ? "ONLINE" : data.format;
  if (format === "ONLINE" && !data.onlineLink) {
    return { error: "Add a meeting link for online classes." };
  }

  const priceCents = Math.round((data.priceDollars ?? 0) * 100);
  if (priceCents > 0) {
    const payout = await db.payoutAccount.findUnique({ where: { userId: user.id } });
    if (!payout?.chargesEnabled) {
      return {
        error:
          "Set up payouts before charging for classes, see the Payouts section on your dashboard.",
      };
    }
  }

  const shared = {
    title: data.title,
    style: data.style,
    description: data.description,
    format,
    level: data.level,
    location: format === "IN_PERSON" ? data.location || ctx.fallbackLocation : null,
    onlineLink: format === "ONLINE" ? data.onlineLink || null : null,
    timezone,
    durationMin: data.durationMin,
    capacity: data.capacity,
    points: data.points,
    priceCents,
    currency: "aud",
    hostId: user.id,
    studioId: ctx.studioId,
  };

  let created = 1;

  if (data.repeatWeekly && (data.repeatWeeks ?? 0) > 1) {
    const weeks = data.repeatWeeks!;
    const lastDate = addDaysToDateString(data.date, (weeks - 1) * 7);

    const series = await db.classSeries.create({
      data: {
        ...shared,
        dayOfWeek: dayOfWeekInTimeZone(startTime, timezone),
        localTime: data.time,
        startsOn: startTime,
        endsOn: zonedDateTimeToUtc(lastDate, data.time, timezone),
        frequency: "WEEKLY",
      },
    });

    // Each occurrence is derived from the local wall-clock time, so a weekly
    // 7pm class stays at 7pm even across a daylight-saving transition (the
    // underlying UTC instant shifts by an hour, which is correct).
    const sessions = Array.from({ length: weeks }, (_, i) => ({
      ...shared,
      seriesId: series.id,
      startTime: zonedDateTimeToUtc(
        addDaysToDateString(data.date, i * 7),
        data.time,
        timezone
      ),
    }));

    const result = await db.danceClass.createMany({
      data: sessions,
      skipDuplicates: true,
    });
    created = result.count;
  } else {
    await db.danceClass.create({ data: { ...shared, startTime } });
  }

  revalidatePath("/discover");
  revalidatePath("/studio");
  revalidatePath("/teach");

  return { success: true, created };
}

const editClassSchema = classFormSchema.pick({
  title: true,
  description: true,
  location: true,
  onlineLink: true,
  date: true,
  time: true,
  capacity: true,
});

export type EditClassState = { error?: string; success?: string } | undefined;

export async function editClassAction(
  _prev: EditClassState,
  formData: FormData
): Promise<EditClassState> {
  const user = await requireUser();
  const classId = formData.get("classId");
  if (typeof classId !== "string") return { error: "Missing class." };

  const existing = await db.danceClass.findUnique({
    where: { id: classId },
    include: { bookings: { where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] } } } },
  });
  if (!existing) return { error: "Class not found." };
  if (!(await canManageClass(user, existing))) {
    return { error: "You can't edit this class." };
  }

  const parsed = editClassSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const data = parsed.data;

  const startTime = zonedDateTimeToUtc(data.date, data.time, existing.timezone);
  if (Number.isNaN(startTime.getTime())) {
    return { error: "Enter a valid date and time." };
  }
  if (data.capacity < existing.bookings.length) {
    return {
      error: `${existing.bookings.length} people are already booked, capacity can't go below that.`,
    };
  }

  await db.danceClass.update({
    where: { id: classId },
    data: {
      title: data.title,
      description: data.description,
      location: data.location || existing.location,
      onlineLink: data.onlineLink || existing.onlineLink,
      startTime,
      capacity: data.capacity,
    },
  });

  revalidatePath("/discover");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/studio");
  revalidatePath("/teach");

  return { success: "Class updated." };
}

/** Cancels a class, refunds paid bookings and emails everyone booked. */
export async function cancelClassAction(
  classId: string,
  formData?: FormData
): Promise<void> {
  const user = await requireUser();
  const rawReason = formData?.get("reason");
  const reason = typeof rawReason === "string" && rawReason.trim()
    ? rawReason.trim()
    : undefined;

  const danceClass = await db.danceClass.findUnique({
    where: { id: classId },
    include: {
      studio: { select: { name: true } },
      host: { select: { name: true, displayName: true } },
      bookings: {
        where: { status: { in: ["BOOKED", "PENDING_PAYMENT", "WAITLISTED"] } },
        include: { user: { select: { email: true, name: true } }, payment: true },
      },
    },
  });
  if (!danceClass) return;
  if (!(await canManageClass(user, danceClass))) return;
  if (danceClass.cancelledAt) return;

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
}
