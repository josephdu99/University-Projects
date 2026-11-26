import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { syncSheets } from "@/lib/schedule-sync";
import { logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sync connected Google Sheets: every studio's (Vercel Cron, once a day at
 * 17:00 UTC, about 3 to 4am in Sydney), or one studio's with `?studio=`.
 * All the work is in `syncSheets`, shared with the dashboard and Sync now,
 * so syncing more often later only means calling this more often.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    logWarn("cron.syncSheets.unauthorized");
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const studioId = new URL(request.url).searchParams.get("studio") ?? undefined;
  const results = await syncSheets({ studioId });
  return NextResponse.json({
    ok: true,
    sheets: results.length,
    unchanged: results.filter((r) => r.unchanged).length,
    added: results.reduce((s, r) => s + r.added, 0),
    updated: results.reduce((s, r) => s + r.updated, 0),
    waiting: results.reduce((s, r) => s + r.waiting, 0),
    removed: results.reduce((s, r) => s + r.removed, 0),
    failed: results.filter((r) => r.error).length,
  });
}
