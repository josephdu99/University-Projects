import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/reminders";
import { logWarn } from "@/lib/logger";

// Reminders read and write, so this must never be cached or prerendered.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run wide open when the secret is not configured: an
  // unauthenticated endpoint that emails people is worse than a job that
  // hasn't started yet, and the failure is visible in the logs.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Pre-class reminders, driven by Vercel Cron (see vercel.json).
 *
 * Once a day, because that is all the Hobby plan allows: an hourly schedule
 * is rejected at deploy time. The job is written for that. It decides what
 * each class is due from the calendar, today's classes get the day-of mail
 * and tomorrow's get the day-before one, so one run a day sends both.
 *
 * The schedule is 20:00 UTC, early morning across Australia, where the
 * classes are. Hobby fires any time within that hour. The work is idempotent
 * per booking, so calling this again by hand, or more often on a bigger
 * plan, sends nothing twice.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    logWarn("cron.reminders.unauthorized");
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const run = await sendDueReminders();
  return NextResponse.json({ ok: true, ...run });
}
