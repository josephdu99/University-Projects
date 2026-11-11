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
 * Hourly rather than at two fixed times, because classes run in several
 * timezones and a single daily tick would be the evening before for some
 * dancers and the middle of the night for others. The work is idempotent per
 * booking, so running often is cheap and missing a run costs nothing.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    logWarn("cron.reminders.unauthorized");
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const run = await sendDueReminders();
  return NextResponse.json({ ok: true, ...run });
}
