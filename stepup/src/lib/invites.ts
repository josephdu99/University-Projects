import { db } from "@/lib/db";
import { looksLikeInviteCode, normaliseInviteCode } from "@/lib/team";
import { suburbFromAddress } from "@/lib/suburbs";

export type InviteLookup =
  | {
      ok: true;
      code: string;
      memberId: string;
      name: string;
      contact: string;
      role: "TEACHER" | "MANAGER";
      studioId: string;
      studio: string;
      suburb: string | null;
      invitedBy: string;
    }
  | { ok: false; reason: "unknown" | "expired" | "used"; studio?: string };

/**
 * What an invite code opens, if anything. A code is good once: it is cleared
 * when someone joins with it, so a used code reads the same as one that never
 * existed. An expired one says so and names the studio, so the teacher knows
 * who to ask for a new one.
 */
export async function findInvite(raw: string): Promise<InviteLookup> {
  const code = normaliseInviteCode(raw);
  if (!looksLikeInviteCode(code)) return { ok: false, reason: "unknown" };

  const member = await db.studioMember.findUnique({
    where: { inviteCode: code },
    include: {
      studio: { select: { id: true, name: true, suburb: true, address: true, suspendedAt: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!member || member.studio.suspendedAt) return { ok: false, reason: "unknown" };
  if (member.status !== "INVITED") return { ok: false, reason: "used" };
  if (!member.inviteExpiresAt || member.inviteExpiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired", studio: member.studio.name };
  }

  return {
    ok: true,
    code,
    memberId: member.id,
    name: member.name,
    contact: member.contact,
    role: member.role === "MANAGER" ? "MANAGER" : "TEACHER",
    studioId: member.studio.id,
    studio: member.studio.name,
    suburb: member.studio.suburb ?? suburbFromAddress(member.studio.address)?.name ?? null,
    invitedBy: member.invitedBy?.name ?? member.studio.name,
  };
}

export function inviteErrorMessage(r: Extract<InviteLookup, { ok: false }>): string {
  if (r.reason === "expired") {
    return `That invite has run out. Ask ${r.studio ?? "the studio"} to send you a new one.`;
  }
  return "We couldn’t find that code. Check your invite, or ask the studio to resend it.";
}
