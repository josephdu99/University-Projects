import { db } from "@/lib/db";
import { createHash } from "node:crypto";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * Database-backed sliding-window rate limiter.
 *
 * Serverless functions don't share memory between invocations, so an in-memory
 * counter would reset constantly and enforce nothing. Postgres is the shared
 * state we already have; at this scale the extra query is cheap. A dedicated
 * store (Redis/Upstash) would be the next step if limits get hot.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs);

  const attempts = await db.loginAttempt.count({
    where: { email: key, attemptedAt: { gte: since }, successful: false },
  });

  if (attempts >= maxAttempts) {
    const oldest = await db.loginAttempt.findFirst({
      where: { email: key, attemptedAt: { gte: since }, successful: false },
      orderBy: { attemptedAt: "asc" },
      select: { attemptedAt: true },
    });
    const retryAfterMs = oldest
      ? Math.max(0, oldest.attemptedAt.getTime() + windowMs - Date.now())
      : windowMs;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  await db.loginAttempt.create({ data: { email: key, successful: false } });

  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - attempts - 1),
    retryAfterMs: 0,
  };
}

/** Clears the failure counter after a successful action. */
export async function clearRateLimit(key: string) {
  await db.loginAttempt.deleteMany({ where: { email: key, successful: false } });
  await db.loginAttempt.create({ data: { email: key, successful: true } });
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // Store only a hash — the raw address is personal data we don't need.
  return createHash("sha256")
    .update(ip + (process.env.AUTH_SECRET ?? ""))
    .digest("hex")
    .slice(0, 32);
}

/** Housekeeping: drop attempt rows older than a day. */
export async function pruneRateLimitHistory() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await db.loginAttempt.deleteMany({
    where: { attemptedAt: { lt: cutoff } },
  });
  return count;
}
