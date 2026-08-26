import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { APP_ENV } from "@/lib/environment";
import { databaseHost } from "@/lib/database-url";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Verifies the app can actually reach the database,
 * rather than just returning 200 because the process is up.
 */
export async function GET() {
  const started = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    // `environment` and the database host make it obvious at a glance which
    // deployment you are hitting and which database it is wired to — the two
    // things that go wrong when there is more than one environment.
    return NextResponse.json({
      status: "ok",
      environment: APP_ENV,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      databaseHost: databaseHost(),
      database: "connected",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        environment: APP_ENV,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        databaseHost: databaseHost(),
        database: "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
