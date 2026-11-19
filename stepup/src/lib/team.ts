/**
 * Studio teams and invites: the rules both the dashboard form and the server
 * enforce. Pure and client-safe, so the form can show an invite code's shape
 * and catch a bad mobile number before anything is sent.
 */

export type TeamRole = "OWNER" | "MANAGER" | "TEACHER";
export type MemberStatus = "INVITED" | "ACTIVE";

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  TEACHER: "Teacher",
};

/** Roles that can run the studio dashboard: create classes, invite people. */
export const STUDIO_ADMIN_ROLES: TeamRole[] = ["OWNER", "MANAGER"];

/** How long an invite code stays usable. */
export const INVITE_TTL_DAYS = 14;

/** At most this many invites in one go, so the form can't be used to spam. */
export const MAX_INVITES_PER_SEND = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/**
 * An Australian mobile: 04xx xxx xxx, or the same with +61 / 61 in place of
 * the leading 0. Spaces, dashes and brackets are ignored.
 */
export function isAuMobile(value: string): boolean {
  return /^(?:\+?61|0)4\d{8}$/.test(value.replace(/[\s\-()]/g, ""));
}

export type Contact = { kind: "email" | "mobile"; value: string };

/**
 * An invitee's contact, tidied: emails lower-cased, mobiles written the local
 * way ("0412 345 678"). Null when it is neither.
 */
export function parseContact(raw: string): Contact | null {
  const v = String(raw ?? "").trim();
  if (isEmail(v)) return { kind: "email", value: v.toLowerCase() };
  if (isAuMobile(v)) {
    const digits = v.replace(/\D/g, "");
    const local = digits.startsWith("61") ? `0${digits.slice(2)}` : digits;
    return {
      kind: "mobile",
      value: `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`,
    };
  }
  return null;
}

const FILLER = /\b(dance|dancing|studio|studios|academy|school|the|and|of|co)\b/gi;

/**
 * The readable half of an invite code: the studio's name in capitals, minus
 * filler words like "dance" and "studio", letters only, at most six. So
 * "Ritmo Dance Studio" gives "RITMO".
 */
export function invitePrefix(studioName: string): string {
  const letters = String(studioName ?? "")
    .replace(FILLER, "")
    .replace(/[^a-z]/gi, "")
    .toUpperCase()
    .slice(0, 6);
  return letters || "STUDIO";
}

/** No 0/O or 1/I, so a code read out over the phone survives. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/**
 * A fresh invite code, e.g. "RITMO-7K3QXM".
 *
 * The design's prototype used four digits, which with a guessable prefix is
 * ten thousand tries from joining any studio. Six characters from a 32-letter
 * alphabet is about a billion, and lookups are rate limited on top. The
 * random bytes are a parameter so tests can pin them.
 */
export function makeInviteCode(
  studioName: string,
  randomBytes: (n: number) => Uint8Array = (n) =>
    crypto.getRandomValues(new Uint8Array(n)),
): string {
  const bytes = randomBytes(CODE_LENGTH);
  // 256 is a multiple of 32, so taking each byte mod 32 is unbiased.
  const tail = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${invitePrefix(studioName)}-${tail}`;
}

/**
 * What somebody typed or pasted into the code box, as a code: upper case, no
 * spaces, and the code itself if they pasted the whole join link.
 */
export function normaliseInviteCode(raw: string): string {
  const v = String(raw ?? "").trim();
  const last = v.split("/").filter(Boolean).pop() ?? "";
  return last.replace(/\s+/g, "").toUpperCase();
}

export function looksLikeInviteCode(code: string): boolean {
  return /^[A-Z]{1,6}-[A-Z0-9]{4,8}$/.test(code);
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}
