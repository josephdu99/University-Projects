import { db } from "@/lib/db";
import { sendClassReminder, appUrl } from "@/lib/email";
import { issueToken, TOKEN_PURPOSE } from "@/lib/tokens";
import { logError, logInfo } from "@/lib/logger";
import {
  classDayRelativeTo,
  reminderStageFor,
  type ReminderStage,
} from "@/lib/reminder-stage";

export type { ReminderStage };

const SEAT_HOLDING = ["BOOKED", "ATTENDED"];

/**
 * How far ahead to look for candidates. The earliest a reminder can fall due
 * is 6pm the evening before a class that starts just before midnight, about
 * 30 hours ahead, so this reaches a little past that. It only bounds the
 * query; whether a booking is actually due is decided by `reminderStageFor`.
 */
const LOOKAHEAD_MS = 32 * 60 * 60 * 1000;

/**
 * How long one run may spend sending. The route is allowed 60 seconds and an
 * external scheduler typically hangs up sooner, so a run stops taking on new
 * work well before either and leaves the rest for the next call, rather than
 * being cut off halfway through a send.
 */
const TIME_BUDGET_MS = 40 * 1000;

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
  /** Due but left for the next run because this one ran out of time. */
  deferred: number;
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
 * Called by an external scheduler, on whatever schedule that is set to, so
 * nothing here assumes a cadence. Each reminder has a time it falls due (see
 * `reminderStageFor`) and is sent by the first run at or after it.
 *
 * Each booking carries a stamp per reminder, and a run claims the stamp
 * before it sends: one conditional update that only succeeds while the stamp
 * is still empty. Two runs that overlap, a scheduler retry landing on top of
 * a slow run, somebody calling the endpoint by hand, cannot both win that
 * update, so they cannot both send. If the send then fails the claim is
 * released, and the next run tries again.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const startedAt = Date.now();
  const run: ReminderRun = {
    sent: 0,
    failed: 0,
    deferred: 0,
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
      bookedAt: true,
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

    const stage = reminderStageFor({
      startTime: booking.class.startTime,
      timezone: booking.class.timezone,
      bookedAt: booking.bookedAt,
      now,
    });
    if (!stage) continue;

    const stampField =
      stage === "day-before" ? "remindedDayBeforeAt" : "remindedDayOfAt";
    if (booking[stampField]) continue;

    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      run.deferred++;
      continue;
    }

    // Claim before sending. Only one run can turn an empty stamp into a
    // full one, so only one run sends.
    const claim = await db.booking.updateMany({
      where: { id: booking.id, [stampField]: null },
      data: { [stampField]: new Date() },
    });
    if (claim.count === 0) continue;

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
        // Read off the calendar in the class's own timezone, so the mail
        // never says "Tomorrow" about a class that is today.
        day: classDayRelativeTo(
          booking.class.startTime,
          booking.class.timezone,
          now,
        ),
        online: booking.class.format === "ONLINE",
        where: booking.class.location ?? booking.class.studio?.address ?? null,
        firstTimers,
        // A guest has no schedule page to land on, so the link is a
        // fresh booking token. Registered dancers get their schedule.
        manageUrl: booking.user.passwordHash
          ? appUrl("/schedule")
          : await guestManageUrl(booking.userId, booking.class.id),
      });

      run.sent++;
      run.byStage[stage]++;
    } catch (err) {
      // Give the claim back so the next run tries again.
      run.failed++;
      logError("reminders.send", err, { bookingId: booking.id, stage });
      await db.booking
        .updateMany({
          where: { id: booking.id },
          data: { [stampField]: null },
        })
        .catch((releaseErr) =>
          logError("reminders.release", releaseErr, { bookingId: booking.id }),
        );
    }
  }

  logInfo("reminders.run", {
    sent: run.sent,
    failed: run.failed,
    deferred: run.deferred,
    dayBefore: run.byStage["day-before"],
    dayOf: run.byStage["day-of"],
  });
  return run;
}
