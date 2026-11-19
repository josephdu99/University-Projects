import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Links that carry their own proof, for the two places a student or teacher
 * acts from an email without signing in: leaving a studio's offers, and a
 * teacher opening their class list. Each signs exactly what it allows, so a
 * link can't be edited into another one.
 */
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
}

function sign(parts: string[]): string {
  return createHmac("sha256", secret()).update(parts.join("\u0000")).digest("base64url");
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** One-click "stop sending me offers from this studio". Never expires. */
export function unsubscribeSig(userId: string, studioId: string) {
  return sign(["unsubscribe", userId, studioId]);
}

export function unsubscribePath(userId: string, studioId: string) {
  return `/unsubscribe?u=${encodeURIComponent(userId)}&s=${encodeURIComponent(studioId)}&sig=${unsubscribeSig(userId, studioId)}`;
}

export function checkUnsubscribe(userId: string, studioId: string, sig: string) {
  return Boolean(userId && studioId && sig) && same(sig, unsubscribeSig(userId, studioId));
}

/**
 * A teacher's class list, from the email sent 48 hours before. It works until
 * the day after the class, and only for the person it was sent to.
 */
export function classListSig(classId: string, memberId: string, expires: number) {
  return sign(["class-list", classId, memberId, String(expires)]);
}

export function classListPath(classId: string, memberId: string, classStart: Date) {
  const expires = classStart.getTime() + 24 * 60 * 60_000;
  return `/class-list/${classId}?m=${encodeURIComponent(memberId)}&e=${expires}&sig=${classListSig(classId, memberId, expires)}`;
}

export function checkClassList(classId: string, memberId: string, expires: string, sig: string, now = Date.now()) {
  const e = Number(expires);
  if (!memberId || !sig || !Number.isFinite(e) || e < now) return false;
  return same(sig, classListSig(classId, memberId, e));
}
