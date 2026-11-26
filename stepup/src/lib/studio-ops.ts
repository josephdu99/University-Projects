import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { sendClassMessage, sendClassRescheduled, sendCourseOpen, sendPassOffer, sendVenueChanged } from "@/lib/email-studio";
import { sendSms, smsConfigured } from "@/lib/sms";
import { unsubscribePath } from "@/lib/signed-links";
import { findSuburb, suburbFromAddress } from "@/lib/suburbs";
import { dayOfWeekInTimeZone, formatClassWhen } from "@/lib/time";
import { planReschedule, rescheduleChanges, rescheduleProblem } from "@/lib/reschedule";
import { logError } from "@/lib/logger";

/**
 * What the dashboard, text commands and the nightly jobs all do the same
 * way: message a class, move it, tell people a course is open, send a pass
 * offer. Plain server code, not actions: callers check who's asking first.
 */

const people = (n: number) => `${n} ${n === 1 ? "student" : "students"}`;

export type ClassToMessage = {
  id: string;
  title: string;
  startTime: Date;
  timezone: string;
  studio: { name: string; owner: { email: string } } | null;
  host: { name: string; displayName: string | null; email: string };
};

/** Everyone booked, by email and (once StepUp's number is set up) SMS. Kept with the class. */
export async function sendToClass(c: ClassToMessage, senderId: string | null, body: string): Promise<string> {
  const booked = await db.booking.findMany({
    where: { classId: c.id, status: { in: ["BOOKED", "PENDING_PAYMENT"] } },
    select: { user: { select: { email: true, name: true, phone: true } } },
  });
  const hostName = c.studio?.name ?? (c.host.displayName?.trim() || c.host.name);
  const sms = smsConfigured();
  for (const b of booked) {
    if (b.user.email) {
      await sendClassMessage({
        to: b.user.email,
        name: b.user.name,
        hostName,
        classTitle: c.title,
        startTime: c.startTime,
        timezone: c.timezone,
        body,
        replyTo: c.studio?.owner.email ?? c.host.email,
      }).catch((err) => logError("email.classMessage", err));
    }
    if (sms) await sendSms(b.user.phone, `${hostName}, ${c.title}: ${body}`).catch(() => false);
  }
  await db.classMessage.create({
    data: { classId: c.id, senderId, body, recipients: booked.length, channels: sms ? "SMS_EMAIL" : "EMAIL" },
  });
  return `Message sent to ${people(booked.length)} by ${sms ? "SMS and email" : "email"}.`;
}

export type ResolvedVenue = { id: string | null; name: string; location: string; suburb: string | null };

/** A venue choice ("studio" or a saved venue's id) for a studio. */
export async function venueFor(
  studio: { id: string; name: string; address: string; city: string; suburb: string | null },
  choice: string,
): Promise<ResolvedVenue | null> {
  if (choice === "studio" || !choice) {
    return {
      id: null,
      name: studio.name,
      location: `${studio.address}, ${studio.city}`,
      suburb: findSuburb(studio.suburb)?.name ?? suburbFromAddress(studio.address)?.name ?? null,
    };
  }
  const v = await db.venue.findFirst({ where: { id: choice, studioId: studio.id } });
  if (!v) return null;
  return { id: v.id, name: v.name, location: v.address, suburb: v.suburb ?? suburbFromAddress(v.address)?.name ?? null };
}

/**
 * Move one class, or it and every later class in its series, keeping the
 * bookings. Everyone booked is told, and may cancel free afterwards (the
 * class's venueChangedAt is later than their booking).
 */
export async function moveClass(
  c: { id: string; seriesId: string | null; startTime: Date },
  v: ResolvedVenue,
  future: boolean,
): Promise<string> {
  const now = new Date();
  const data = { venueId: v.id, location: v.location, suburb: v.suburb, venueChangedAt: now };
  const where =
    future && c.seriesId ? { seriesId: c.seriesId, startTime: { gte: c.startTime }, cancelledAt: null } : { id: c.id };
  const moved = await db.danceClass.findMany({ where, select: { id: true, title: true, startTime: true, timezone: true } });
  await db.danceClass.updateMany({ where, data });
  if (future && c.seriesId) {
    await db.classSeries.update({ where: { id: c.seriesId }, data: { venueId: v.id, location: v.location, suburb: v.suburb } });
  }
  const bookings = await db.booking.findMany({
    where: { classId: { in: moved.map((m) => m.id) }, status: { in: ["BOOKED", "PENDING_PAYMENT"] } },
    select: { classId: true, user: { select: { email: true, phone: true } } },
  });
  for (const b of bookings) {
    const m = moved.find((x) => x.id === b.classId)!;
    if (b.user.email) {
      await sendVenueChanged({
        to: b.user.email,
        classTitle: m.title,
        startTime: m.startTime,
        timezone: m.timezone,
        venueName: v.name,
        address: v.location,
        classUrl: appUrl(`/first-class/${m.id}`),
      }).catch((err) => logError("email.venueChanged", err));
    }
    await sendSms(
      b.user.phone,
      `${m.title}, ${formatClassWhen(m.startTime, m.timezone)}, has moved to ${v.name}, ${v.location}. Can't make it? Cancel free in StepUp.`,
    ).catch(() => false);
  }
  return `${moved[0]?.title ?? "Class"} ${future ? "(this and all future classes)" : "(this class only)"} moved to ${v.name}. ${people(
    bookings.length,
  )} told by ${smsConfigured() ? "SMS and email" : "email"}.`;
}

/**
 * Reschedule one class, or it and every later class in its series: a new
 * date and start time, length or venue. Bookings move with it. Everyone
 * booked is told by email (and SMS once it's set up), and may cancel free
 * afterwards whatever the policy says (the class's venueChangedAt is later
 * than their booking).
 */
export async function rescheduleClass(
  c: { id: string; seriesId: string | null; startTime: Date; timezone: string; durationMin: number; venueId: string | null },
  input: { date: string; time: string; durationMin: number; venue: ResolvedVenue; future: boolean },
  now = new Date(),
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const future = input.future && Boolean(c.seriesId);
  const sessionSelect = {
    id: true,
    title: true,
    startTime: true,
    bookings: { where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] } }, select: { user: { select: { email: true, phone: true } } } },
  } satisfies Prisma.DanceClassSelect;
  const sessions = future
    ? await db.danceClass.findMany({
        where: { seriesId: c.seriesId, startTime: { gte: c.startTime }, cancelledAt: null },
        orderBy: { startTime: "asc" },
        select: sessionSelect,
      })
    : await db.danceClass.findMany({ where: { id: c.id }, select: sessionSelect });
  // The class picked always goes first.
  sessions.sort((a, b) => (a.id === c.id ? -1 : b.id === c.id ? 1 : a.startTime.getTime() - b.startTime.getTime()));
  const plan = planReschedule({ sessions, timezone: c.timezone, date: input.date, time: input.time });

  const moving = new Set(plan.map((m) => m.id));
  const others = c.seriesId
    ? (
        await db.danceClass.findMany({
          where: { seriesId: c.seriesId, cancelledAt: null, startTime: { gte: now } },
          select: { id: true, startTime: true },
        })
      )
        .filter((o) => !moving.has(o.id))
        .map((o) => o.startTime)
    : [];
  const problem = rescheduleProblem({ ...input, timezone: c.timezone, now, plan, others });
  if (problem) return { ok: false, error: problem };

  const changed = rescheduleChanges({ plan, current: c, durationMin: input.durationMin, venueId: input.venue.id });
  if (!changed.time && !changed.length && !changed.venue) return { ok: false, error: "Nothing's changed yet." };

  const venueData = { venueId: input.venue.id, location: input.venue.location, suburb: input.venue.suburb };
  await db.$transaction(async (tx) => {
    for (const m of plan) {
      await tx.danceClass.update({
        where: { id: m.id },
        data: {
          startTime: m.newStart,
          durationMin: input.durationMin,
          ...venueData,
          venueChangedAt: now,
          // The teacher's class list goes out again for the new time.
          ...(m.newStart.getTime() !== m.oldStart.getTime() ? { teacherListSentAt: null } : {}),
        },
      });
    }
    if (future && c.seriesId) {
      await tx.classSeries.update({
        where: { id: c.seriesId },
        data: { dayOfWeek: dayOfWeekInTimeZone(plan[0].newStart, c.timezone), localTime: input.time, durationMin: input.durationMin, ...venueData },
      });
    }
  });

  let told = 0;
  for (const m of plan) {
    const s = sessions.find((x) => x.id === m.id)!;
    for (const b of s.bookings) {
      told++;
      const classUrl = appUrl(`/first-class/${m.id}`);
      if (b.user.email) {
        if (changed.time || changed.length) {
          await sendClassRescheduled({
            to: b.user.email,
            classTitle: s.title,
            oldStart: m.oldStart,
            newStart: m.newStart,
            timezone: c.timezone,
            classUrl,
            durationMin: changed.length ? input.durationMin : undefined,
            venue: changed.venue ? { name: input.venue.name, address: input.venue.location } : null,
          }).catch((err) => logError("email.classRescheduled", err));
        } else {
          await sendVenueChanged({
            to: b.user.email,
            classTitle: s.title,
            startTime: m.newStart,
            timezone: c.timezone,
            venueName: input.venue.name,
            address: input.venue.location,
            classUrl,
          }).catch((err) => logError("email.venueChanged", err));
        }
      }
      const when = formatClassWhen(m.newStart, c.timezone);
      const sms = changed.time
        ? `${s.title} has a new time: ${when}${changed.venue ? `, at ${input.venue.name}` : ""}. Can't make it? Cancel free in StepUp.`
        : changed.venue
          ? `${s.title}, ${when}, has moved to ${input.venue.name}, ${input.venue.location}. Can't make it? Cancel free in StepUp.`
          : `${s.title}, ${when}, now runs for ${input.durationMin} minutes. Can't make it? Cancel free in StepUp.`;
      await sendSms(b.user.phone, sms).catch(() => false);
    }
  }

  const title = sessions[0]?.title ?? "Class";
  const what = changed.time ? `moved to ${formatClassWhen(plan[0].newStart, c.timezone)}` : changed.venue ? `moved to ${input.venue.name}` : `now runs for ${input.durationMin} minutes`;
  const scope = plan.length > 1 ? ` (this and ${plan.length - 1} later ${plan.length === 2 ? "class" : "classes"})` : "";
  return {
    ok: true,
    message: `${title}${scope} ${what}. ${
      told ? `${people(told)} told by ${smsConfigured() ? "SMS and email" : "email"}, and anyone who can't make it can cancel free.` : "Nobody was booked yet."
    }`,
  };
}

/** People who asked to hear when this studio's next course in a style opens. */
export async function notifyCourseInterest(
  studio: { id: string; name: string; timezone: string },
  style: string,
  classId: string,
  startsOn: Date,
) {
  const waiting = await db.courseInterest.findMany({ where: { studioId: studio.id, style, notifiedAt: null } });
  for (const w of waiting) {
    const user = await db.user.findUnique({ where: { email: w.email }, select: { id: true } });
    const opted = user ? await db.studioOptOut.findUnique({ where: { studioId_userId: { studioId: studio.id, userId: user.id } } }) : null;
    if (!opted) {
      await sendCourseOpen({
        to: w.email,
        studioName: studio.name,
        courseTitle: `${style} course`,
        startsOn,
        timezone: studio.timezone,
        url: appUrl(`/first-class/${classId}`),
        unsubscribeUrl: user ? appUrl(unsubscribePath(user.id, studio.id)) : appUrl(`/first-class/${classId}`),
      }).catch((err) => logError("email.courseOpen", err));
    }
    await db.courseInterest.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
  }
}

/**
 * Who a pass offer goes to: students after their first class (exactly one
 * attended), or everyone who's booked the studio. Anyone who opted out of the
 * studio's offers is left out.
 */
export async function passAudience(hostId: string, studioId: string, audience: "FIRST" | "ALL") {
  const optedOut = new Set(
    (await db.studioOptOut.findMany({ where: { studioId }, select: { userId: true } })).map((o) => o.userId),
  );
  const rows = await db.booking.groupBy({
    by: ["userId"],
    where: {
      class: { hostId },
      status: audience === "FIRST" ? "ATTENDED" : { in: ["BOOKED", "ATTENDED", "NO_SHOW"] },
    },
    _count: { _all: true },
  });
  const ids = rows
    .filter((r) => audience === "ALL" || r._count._all === 1)
    .map((r) => r.userId)
    .filter((id) => !optedOut.has(id));
  return db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
}

export async function deliverPassOffer(
  studio: { id: string; name: string; owner?: { email: string } | null },
  pass: { id: string; name: string; priceCents: number; link: string | null },
  message: string,
  student: { id: string; name: string; email: string },
  offerId: string,
) {
  const owner =
    studio.owner ??
    (await db.studio.findUnique({ where: { id: studio.id }, select: { owner: { select: { email: true } } } }))?.owner;
  await sendPassOffer({
    to: student.email,
    name: student.name,
    studioName: studio.name,
    message,
    passName: pass.name,
    priceCents: pass.priceCents,
    link: pass.link,
    replyTo: owner?.email ?? null,
    unsubscribeUrl: appUrl(unsubscribePath(student.id, studio.id)),
  }).catch((err) => logError("email.passOffer", err));
  await db.passOfferRecipient.upsert({
    where: { offerId_userId: { offerId, userId: student.id } },
    create: { offerId, userId: student.id },
    update: {},
  });
}
