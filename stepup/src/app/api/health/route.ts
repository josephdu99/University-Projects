import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Verifies the app can actually reach the database,
 * rather than just returning 200 because the process is up.
 */
export async function GET() {
  const started = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
