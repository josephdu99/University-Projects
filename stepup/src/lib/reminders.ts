import { db } from "@/lib/db";
import { sendClassReminder, appUrl } from "@/lib/email";
import { issueToken, TOKEN_PURPOSE } from "@/lib/tokens";
import { logError, logInfo } from "@/lib/logger";
import { reminderStageFor, type ReminderStage } from "@/lib/reminder-stage";

export type { ReminderStage };

const SEAT_HOLDING = ["BOOKED", "ATTENDED"];

/**
 * How far ahead to look for candidates. "Tomorrow", in the class's own
 * timezone, can end up to 48 hours from now, so this reaches just past that.
 * It only bounds the query; which reminder a class actually gets is decided
 * per class by `reminderStageFor`.
 */
const LOOKAHEAD_MS = 49 * 60 * 60 * 1000;

/**
 * The manage link for a guest, who has no schedule to send them to.
 * Issued per reminder so it is always fresh enough to still work.
 */
export async function guestManageUrl(
  userId: string,
  classId: string,
): Promise<string> {
  const token = await issueToken(userId, TOKEN_PURPOSE.GUEST_BOOKING);
  return appUrl(
    `/first-class/${classId}/booked?t=${encodeURIComponent(token)}`,
  );
}

export type ReminderRun = {
  sent: number;
  failed: number;
  byStage: Record<ReminderStage, number>;
};

/**
 * How many people holding a seat in this class have never attended anything:
 * the same count the funnel shows, so the mail and the page agree.
 */
async function countFirstTimers(classId: string): Promise<number> {
  const holders = await db.booking.findMany({
    where: {
      classId,
      status: { in: ["BOOKED", "ATTENDED", "PENDING_PAYMENT"] },
    },
    select: { userId: true },
  });
  if (holders.length === 0) return 0;

  const veterans = new Set(
    (
      await db.booking.findMany({
        where: {
          userId: { in: holders.map((h) => h.userId) },
          status: "ATTENDED",
        },
        select: { userId: true },
        distinct: ["userId"],
      })
    ).map((b) => b.userId),
  );
  return holders.filter((h) => !veterans.has(h.userId)).length;
}

/**
 * Send whichever pre-class reminders are now due.
 *
 * Built to run once a day, which is all Vercel's Hobby plan allows, and to
 * be safe at any other cadence. Each run looks at the bookings for classes
 * in the next two days and asks, per class, what today's date makes it:
 * dated today gets the day-of reminder, dated tomorrow gets the day-before
 * one. A booking made the same day therefore gets one mail, not two.
 *
 * Idempotency is the rest of the design: each booking carries a stamp per
 * stage, a stamped stage is never sent again, and the stamp is written as
 * soon as the send succeeds. A retry or a second run in the same day sends
 * nothing new, and a failed send leaves the stamp null so the next run
 * tries again.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = {
    sent: 0,
    failed: 0,
    byStage: { "day-before": 0, "day-of": 0 },
  };

  const candidates = await db.booking.findMany({
    where: {
      status: { in: SEAT_HOLDING },
      // At least one reminder still outstanding.
      OR: [{ remindedDayBeforeAt: null }, { remindedDayOfAt: null }],
      class: {
        cancelledAt: null,
        // Upcoming only. A class that has already started cannot be
        // reminded about, and back-filling old ones on first deploy would
        // mail everybody about classes they went to weeks ago.
        startTime: { gt: now, lte: new Date(now.getTime() + LOOKAHEAD_MS) },
      },
    },
    orderBy: { class: { startTime: "asc" } },
    take: 500,
    select: {
      id: true,
      userId: true,
      remindedDayBeforeAt: true,
      remindedDayOfAt: true,
      user: { select: { email: true, name: true, passwordHash: true } },
      class: {
        select: {
          id: true,
          title: true,
          startTime: true,
          timezone: true,
          format: true,
          location: true,
          studio: { select: { address: true, name: true } },
        },
      },
    },
  });

  // Everybody in the same class gets the same count, so work it out once.
  const firstTimersByClass = new Map<string, number>();

  for (const booking of candidates) {
    if (!booking.user.email) continue;

    const stage = reminderStageFor(
      booking.class.startTime,
      booking.class.timezone,
      now,
    );
    if (!stage) continue;

    const stampField =
      stage === "day-before" ? "remindedDayBeforeAt" : "remindedDayOfAt";
    if (booking[stampField]) continue;

    try {
      let firstTimers = firstTimersByClass.get(booking.class.id);
      if (firstTimers === undefined) {
        firstTimers = await countFirstTimers(booking.class.id);
        firstTimersByClass.set(booking.class.id, firstTimers);
      }

      await sendClassReminder({
        to: booking.user.email,
        name: booking.user.name,
        classTitle: booking.class.title,
        startTime: booking.class.startTime,
        timezone: booking.class.timezone,
        // The stage is read off the calendar in the class's own timezone,
        // so "today" and "tomorrow" in the mail are true by construction.
        day: stage === "day-of" ? "today" : "tomorrow",
        online: booking.class.format === "ONLINE",
        where: booking.class.location ?? booking.class.studio?.address ?? null,
        firstTimers,
        // A guest has no schedule page to land on, so the link is a
        // fresh booking token. Registered dancers get their schedule.
        manageUrl: booking.user.passwordHash
          ? appUrl("/schedule")
          : await guestManageUrl(booking.userId, booking.class.id),
      });

      await db.booking.update({
        where: { id: booking.id },
        data: { [stampField]: new Date() },
      });

      run.sent++;
      run.byStage[stage]++;
    } catch (err) {
      // Leave the stamp null so the next run tries again.
      run.failed++;
      logError("reminders.send", err, { bookingId: booking.id, stage });
    }
  }

  logInfo("reminders.run", {
    sent: run.sent,
    failed: run.failed,
    dayBefore: run.byStage["day-before"],
    dayOf: run.byStage["day-of"],
  });
  return run;
}
