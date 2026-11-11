import { db } from "@/lib/db";
import { dateKeyInTimeZone } from "@/lib/time";
import { sendClassReminder, appUrl } from "@/lib/email";
import { issueToken, TOKEN_PURPOSE } from "@/lib/tokens";
import { logError, logInfo } from "@/lib/logger";

const SEAT_HOLDING = ["BOOKED", "ATTENDED"];

/**
 * How far ahead each reminder reaches.
 *
 * The windows are open-ended at the top on purpose. A reminder is selected by
 * "the class starts within X and this booking has not had this reminder yet",
 * never by "the class starts between X and Y", so a run that is late, or that
 * is skipped entirely because a deploy was in progress, still catches
 * everything on its next pass instead of leaving a silent gap.
 */
const DAY_BEFORE_MS = 30 * 60 * 60 * 1000; // ~a day and a bit out
const DAY_OF_MS = 10 * 60 * 60 * 1000; // same-day, before most evening classes

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

export type ReminderStage = "day-before" | "day-of";

export type ReminderRun = {
  sent: number;
  failed: number;
  byStage: Record<ReminderStage, number>;
};

/**
 * Send whichever pre-class reminders are now due.
 *
 * Idempotency is the whole design: each booking carries a stamp per stage,
 * the query only picks up bookings whose stamp is null, and the stamp is
 * written as soon as the send succeeds. Two overlapping runs can at worst
 * both pick up the same booking; the stamp means the second one writes
 * nothing new, and a failed send leaves the stamp null so the next run
 * retries it.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = {
    sent: 0,
    failed: 0,
    byStage: { "day-before": 0, "day-of": 0 },
  };

  const dayOfHorizon = new Date(now.getTime() + DAY_OF_MS);

  for (const stage of ["day-before", "day-of"] as const) {
    const horizon =
      stage === "day-before"
        ? new Date(now.getTime() + DAY_BEFORE_MS)
        : dayOfHorizon;
    const stampField =
      stage === "day-before" ? "remindedDayBeforeAt" : "remindedDayOfAt";

    // Somebody who books a few hours before the class should get the
    // day-of nudge and nothing else. Without this floor the same run sends
    // both reminders minutes apart, which reads as a glitch.
    const earliest = stage === "day-before" ? dayOfHorizon : now;

    const due = await db.booking.findMany({
      where: {
        status: { in: SEAT_HOLDING },
        [stampField]: null,
        class: {
          cancelledAt: null,
          // Upcoming only. A class that has already started cannot be
          // reminded about, and back-filling old ones on first deploy would
          // mail everybody about classes they went to weeks ago.
          startTime: { gt: earliest, lte: horizon },
        },
      },
      take: 200,
      select: {
        id: true,
        userId: true,
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

    for (const booking of due) {
      if (!booking.user.email) continue;

      try {
        // How many people holding a seat have never attended anything: the
        // same count the funnel shows, so the mail and the page agree.
        const holders = await db.booking.findMany({
          where: {
            classId: booking.class.id,
            status: { in: ["BOOKED", "ATTENDED", "PENDING_PAYMENT"] },
          },
          select: { userId: true },
        });
        const veterans = new Set(
          holders.length === 0
            ? []
            : (
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
        const firstTimers = holders.filter((h) => !veterans.has(h.userId)).length;

        await sendClassReminder({
          to: booking.user.email,
          name: booking.user.name,
          classTitle: booking.class.title,
          startTime: booking.class.startTime,
          timezone: booking.class.timezone,
          // "Tomorrow" is a claim about the calendar, so it is read off the
          // calendar, in the zone the class happens in, rather than assumed
          // from which reminder is going out.
          today:
            dateKeyInTimeZone(booking.class.startTime, booking.class.timezone) ===
            dateKeyInTimeZone(now, booking.class.timezone),
          online: booking.class.format === "ONLINE",
          where:
            booking.class.location ?? booking.class.studio?.address ?? null,
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
        logError("reminders.send", err, {
          bookingId: booking.id,
          stage,
        });
      }
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
