import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { sendTeacherClassList, sendWwccReminder } from "@/lib/email-studio";
import { sendSms } from "@/lib/sms";
import { classListPath } from "@/lib/signed-links";
import { isEmail, parseContact } from "@/lib/team";
import { wwccReminderDue } from "@/lib/wwcc";
import { releaseSeat } from "@/lib/booking";
import { notifyPromoted, OFFER_HOLD_HOURS } from "@/lib/cancellation";
import { deliverPassOffer } from "@/lib/studio-ops";
import { formatClassWhen } from "@/lib/time";
import { logError } from "@/lib/logger";

/**
 * The studio admin jobs the scheduler runs alongside reminders. Each is safe
 * to run again: a claim (a timestamp set only if it was empty) means calls
 * that overlap or repeat send nothing twice.
 */

const HOUR = 60 * 60_000;

/** 48 hours before class: the teacher gets the class list on their phone. */
export async function sendTeacherClassLists(now = new Date()) {
  const due = await db.danceClass.findMany({
    where: {
      startTime: { gt: now, lte: new Date(now.getTime() + 48 * HOUR) },
      cancelledAt: null,
      teacherListSentAt: null,
      teacherMemberId: { not: null },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      timezone: true,
      hostId: true,
      teacherMember: { select: { id: true, name: true, contact: true, status: true, user: { select: { email: true, phone: true } } } },
      bookings: { where: { status: { in: ["BOOKED", "PENDING_PAYMENT"] } }, select: { userId: true } },
    },
    take: 200,
  });
  let sent = 0;
  for (const c of due) {
    const claim = await db.danceClass.updateMany({ where: { id: c.id, teacherListSentAt: null }, data: { teacherListSentAt: now } });
    if (claim.count !== 1 || !c.teacherMember) continue;
    const t = c.teacherMember;
    const ids = c.bookings.map((b) => b.userId);
    const regulars = ids.length
      ? await db.booking.findMany({
          where: { userId: { in: ids }, status: "ATTENDED", class: { hostId: c.hostId, startTime: { lt: c.startTime } } },
          distinct: ["userId"],
          select: { userId: true },
        })
      : [];
    const url = appUrl(classListPath(c.id, t.id, c.startTime));
    const email = t.user?.email ?? (isEmail(t.contact) ? t.contact.trim() : null);
    const mobile = t.user?.phone ?? (parseContact(t.contact)?.kind === "mobile" ? parseContact(t.contact)!.value : null);
    if (email) {
      await sendTeacherClassList({
        to: email,
        name: t.name,
        classTitle: c.title,
        startTime: c.startTime,
        timezone: c.timezone,
        booked: ids.length,
        firstTimers: ids.length - regulars.length,
        url,
      }).catch((err) => logError("email.teacherClassList", err, { classId: c.id }));
    }
    await sendSms(mobile, `${c.title}, ${formatClassWhen(c.startTime, c.timezone)}: ${ids.length} booked. Class list: ${url}`).catch(() => false);
    sent++;
  }
  return sent;
}

/** 30 days before a Working With Children Check runs out: the studio and the teacher. */
export async function sendWwccReminders(now = new Date()) {
  const members = await db.studioMember.findMany({
    where: { wwccVerifiedAt: { not: null }, wwccExpiry: { gt: now, lte: new Date(now.getTime() + 31 * 24 * HOUR) } },
    select: {
      id: true,
      name: true,
      contact: true,
      wwccNumber: true,
      wwccExpiry: true,
      wwccVerifiedAt: true,
      wwccReminderAt: true,
      user: { select: { email: true } },
      studio: { select: { name: true, owner: { select: { email: true } } } },
    },
  });
  let sent = 0;
  for (const m of members) {
    if (!wwccReminderDue(m, now)) continue;
    const claim = await db.studioMember.updateMany({
      where: { id: m.id, wwccReminderAt: m.wwccReminderAt },
      data: { wwccReminderAt: now },
    });
    if (claim.count !== 1) continue;
    const to = new Set([m.studio.owner.email, m.user?.email ?? (isEmail(m.contact) ? m.contact.trim() : null)].filter(Boolean) as string[]);
    for (const addr of to) {
      await sendWwccReminder({ to: addr, studioName: m.studio.name, teacherName: m.name, number: m.wwccNumber ?? "", expiry: m.wwccExpiry! }).catch((err) =>
        logError("email.wwccReminder", err),
      );
    }
    sent++;
  }
  return sent;
}

/**
 * The studio's automatic pass offer, the day after a student's first class
 * there: once per student per studio, never to anyone who opted out.
 */
export async function sendAutoPassOffers(now = new Date()) {
  const studios = await db.studio.findMany({
    where: { passOfferAuto: true, passOfferPassId: { not: null }, passOfferMessage: { not: null }, suspendedAt: null },
    select: { id: true, name: true, ownerId: true, passOfferMessage: true, passOfferPassId: true, owner: { select: { email: true } } },
  });
  let sent = 0;
  for (const studio of studios) {
    const pass = await db.studioPass.findFirst({ where: { id: studio.passOfferPassId!, archivedAt: null } });
    if (!pass) continue;
    // First classes that ended yesterday-ish: 12 to 72 hours ago.
    const firsts = await db.booking.findMany({
      where: {
        status: "ATTENDED",
        class: { hostId: studio.ownerId, startTime: { gte: new Date(now.getTime() - 72 * HOUR), lte: new Date(now.getTime() - 12 * HOUR) } },
      },
      select: { userId: true, user: { select: { id: true, name: true, email: true } } },
    });
    const candidates = new Map(firsts.map((f) => [f.userId, f.user]));
    if (candidates.size === 0) continue;
    const ids = [...candidates.keys()];
    const [counts, already, optedOut] = await Promise.all([
      db.booking.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "ATTENDED", class: { hostId: studio.ownerId } }, _count: { _all: true } }),
      db.passOfferRecipient.findMany({ where: { userId: { in: ids }, offer: { studioId: studio.id } }, select: { userId: true } }),
      db.studioOptOut.findMany({ where: { studioId: studio.id, userId: { in: ids } }, select: { userId: true } }),
    ]);
    const skip = new Set([...already.map((a) => a.userId), ...optedOut.map((o) => o.userId)]);
    const firstTimers = counts.filter((c) => c._count._all === 1 && !skip.has(c.userId)).map((c) => candidates.get(c.userId)!);
    if (firstTimers.length === 0) continue;
    const offer = await db.passOffer.create({
      data: { studioId: studio.id, passId: pass.id, message: studio.passOfferMessage!, audience: "AUTO", recipients: firstTimers.length },
    });
    for (const s of firstTimers) {
      await deliverPassOffer(studio, pass, studio.passOfferMessage!, s, offer.id);
      sent++;
    }
  }
  return sent;
}

/**
 * An offered place (off the waitlist, on a paid class) is held for 12 hours.
 * Unpaid after that, or once the class has started, it goes to the next
 * person waiting.
 */
export async function expireOfferHolds(now = new Date()) {
  const stale = await db.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      enrolmentId: null,
      OR: [{ bookedAt: { lt: new Date(now.getTime() - OFFER_HOLD_HOURS * HOUR) } }, { class: { startTime: { lt: now } } }],
    },
    select: { id: true },
    take: 200,
  });
  let released = 0;
  for (const b of stale) {
    try {
      const { promoted } = await releaseSeat(b.id);
      await notifyPromoted(promoted);
      released++;
    } catch (err) {
      logError("jobs.expireOfferHold", err, { bookingId: b.id });
    }
  }
  return released;
}

export async function runStudioJobs(now = new Date()) {
  const [classLists, wwcc, passOffers, expired] = [
    await sendTeacherClassLists(now),
    await sendWwccReminders(now),
    await sendAutoPassOffers(now),
    await expireOfferHolds(now),
  ];
  return { classLists, wwcc, passOffers, expired };
}
