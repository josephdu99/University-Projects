import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { sendClassMessage, sendCourseOpen, sendPassOffer, sendVenueChanged } from "@/lib/email-studio";
import { sendSms, smsConfigured } from "@/lib/sms";
import { unsubscribePath } from "@/lib/signed-links";
import { findSuburb, suburbFromAddress } from "@/lib/suburbs";
import { formatClassWhen } from "@/lib/time";
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
