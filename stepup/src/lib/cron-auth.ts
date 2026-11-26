import { timingSafeEqual } from "node:crypto";

/**
 * Scheduled endpoints take `Authorization: Bearer $CRON_SECRET`, which is
 * what Vercel Cron sends and what any outside scheduler can send too. With
 * no secret configured they refuse, rather than run wide open.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
