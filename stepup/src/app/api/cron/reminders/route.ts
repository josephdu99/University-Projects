import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { sendDueReminders } from "@/lib/reminders";
import { runStudioJobs } from "@/lib/studio-jobs";
import { logWarn } from "@/lib/logger";

// Reminders read and write, so this must never be cached or prerendered.
export const dynamic = "force-dynamic";
export const maxDuration = 60;


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
  if (!cronAuthorized(request)) {
    logWarn("cron.reminders.unauthorized");
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const run = await sendDueReminders();
  // Studio admin jobs ride the same schedule: teachers' 48-hour class lists,
  // Working With Children Check reminders, automatic pass offers and
  // expiring offer holds.
  const studio = await runStudioJobs().catch((err) => {
    logWarn("cron.studioJobs.failed", { message: err instanceof Error ? err.message : String(err) });
    return null;
  });
  return NextResponse.json({ ok: true, ...run, studio });
}
