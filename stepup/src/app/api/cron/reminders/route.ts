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
 * Pre-class reminders, called by an external scheduler.
 *
 * There is no Vercel cron: the Hobby plan only allows one run a day, which is
 * too coarse to send "6pm the evening before" in each class's own timezone.
 * A scheduler outside Vercel requests this URL on a timer instead, with the
 * secret in an Authorization header. Setup is in docs/ENVIRONMENTS.md.
 *
 * The schedule therefore lives outside this repository, so the job does not
 * trust it. Reminders are sent by the first call at or after the time they
 * fall due, whatever the interval, and a claim on each booking means calls
 * that overlap or repeat send nothing twice.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    logWarn("cron.reminders.unauthorized");
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const run = await sendDueReminders();
  return NextResponse.json({ ok: true, ...run });
}
