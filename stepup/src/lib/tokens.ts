import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export const TOKEN_PURPOSE = {
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET",
  /**
   * Lets somebody who booked as a guest see and cancel that booking without
   * an account. Read and cancel only: it is never a session, and it cannot
   * set a password. Claiming the account goes through the ordinary password
   * reset, which only ever arrives by email, so possession of this link can
   * never become possession of the account.
   */
  GUEST_BOOKING: "GUEST_BOOKING",
} as const;

export type TokenPurpose = (typeof TOKEN_PURPOSE)[keyof typeof TOKEN_PURPOSE];

const TTL_MS: Record<TokenPurpose, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  // Long enough to still work the evening of a class booked weeks ahead.
  GUEST_BOOKING: 60 * 24 * 60 * 60 * 1000,
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a single-use token, returning the raw value for emailing.
 *
 * Only the SHA-256 hash is persisted, so a database leak can't be replayed
 * into account takeovers. Any outstanding tokens of the same purpose are
 * invalidated first, so a fresh request revokes older links.
 */
export async function issueToken(
  userId: string,
  purpose: TokenPurpose,
  options: { replaceExisting?: boolean } = {}
): Promise<string> {
  // Verification and reset links are one-at-a-time: a fresh request should
  // revoke the older one. Guest booking links are not. A guest can hold
  // several at once, one from the confirmation and one from each reminder,
  // and revoking on issue would mean every reminder quietly broke the link
  // in the email before it.
  const replaceExisting = options.replaceExisting ?? purpose !== "GUEST_BOOKING";
  if (replaceExisting) {
    await db.authToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  }

  const token = randomBytes(32).toString("base64url");

  await db.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS[purpose]),
    },
  });

  return token;
}

export type TokenCheck =
  | { valid: true; userId: string; tokenId: string }
  | { valid: false; reason: string };

export async function verifyToken(
  token: string,
  purpose: TokenPurpose
): Promise<TokenCheck> {
  if (!token) return { valid: false, reason: "Missing token." };

  const record = await db.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return { valid: false, reason: "This link is not valid." };
  if (record.purpose !== purpose) {
    return { valid: false, reason: "This link is not valid." };
  }
  if (record.usedAt) {
    return { valid: false, reason: "This link has already been used." };
  }
  if (record.expiresAt < new Date()) {
    return { valid: false, reason: "This link has expired." };
  }

  // Constant-time compare on the hashes, belt-and-braces against timing
  // analysis even though the lookup was by unique index.
  const a = Buffer.from(record.tokenHash);
  const b = Buffer.from(hashToken(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "This link is not valid." };
  }

  return { valid: true, userId: record.userId, tokenId: record.id };
}

/** Marks a token spent. Returns false if another request already used it. */
export async function consumeToken(tokenId: string): Promise<boolean> {
  const { count } = await db.authToken.updateMany({
    where: { id: tokenId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1;
}

export async function pruneExpiredTokens() {
  const { count } = await db.authToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
