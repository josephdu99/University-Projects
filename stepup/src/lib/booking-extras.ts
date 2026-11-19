import { db } from "@/lib/db";
import { acceptanceOf, currentTerms, recordAcceptance } from "@/lib/terms";
import { isDanceRole, needsRole, type DanceRole } from "@/lib/partner-roles";
import { parseContact } from "@/lib/team";

/**
 * What a booking has to come with, beyond a seat: a role for a partner class,
 * acceptance of the studio's current terms (once per version), and a mobile,
 * because the studio gets the student's name, email and mobile (the Studio
 * Data Promise). Every way of booking runs the same check on the server.
 */
export type ExtrasInput = {
  role: string | null;
  note: string | null;
  acceptTerms: boolean;
  mobile: string | null;
};

export function extrasFromForm(formData: FormData): ExtrasInput {
  const s = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  };
  return {
    role: s("role"),
    note: s("note"),
    acceptTerms: s("acceptTerms") === "on" || s("acceptTerms") === "true",
    mobile: s("mobile"),
  };
}

export type ExtrasOk = {
  role: DanceRole | null;
  note: string | null;
  mobile: string | null;
  terms: { id: string; studioId: string; version: number } | null;
};

/** What this person still has to give before they can book this class. */
export async function requirementsFor(
  userId: string | null,
  c: { partnerRule: string | null; studioId: string | null },
) {
  const terms = await currentTerms(c.studioId);
  const accepted = userId && terms ? await acceptanceOf(userId, terms.id) : null;
  const user = userId ? await db.user.findUnique({ where: { id: userId }, select: { phone: true } }) : null;
  return {
    role: needsRole(c.partnerRule),
    terms: terms && !accepted ? terms : null,
    acceptedTerms: accepted ? { version: accepted.version, acceptedAt: accepted.acceptedAt } : null,
    mobile: !user?.phone,
  };
}

export async function checkExtras(
  userId: string | null,
  c: { partnerRule: string | null; studioId: string | null },
  input: ExtrasInput,
): Promise<{ ok: true; value: ExtrasOk } | { ok: false; error: string }> {
  const req = await requirementsFor(userId, c);
  let role: DanceRole | null = null;
  if (req.role) {
    if (!isDanceRole(input.role)) return { ok: false, error: "Pick Lead, Follow or Either." };
    role = input.role;
  }
  if (req.terms && !input.acceptTerms) {
    return { ok: false, error: "Accept the studio's terms to book." };
  }
  let mobile: string | null = null;
  if (input.mobile && input.mobile.trim()) {
    const parsed = parseContact(input.mobile);
    if (parsed?.kind !== "mobile") return { ok: false, error: "Enter an Australian mobile, like 0412 345 678." };
    mobile = parsed.value;
  } else if (req.mobile) {
    return { ok: false, error: "Add your mobile, so the studio can reach you about the class." };
  }
  return {
    ok: true,
    value: {
      role,
      note: input.note?.trim().slice(0, 280) || null,
      mobile,
      terms: req.terms ? { id: req.terms.id, studioId: req.terms.studioId, version: req.terms.version } : null,
    },
  };
}

/** After a successful booking: keep the mobile and the terms acceptance. */
export async function applyExtras(userId: string, value: ExtrasOk) {
  if (value.mobile) await db.user.update({ where: { id: userId }, data: { phone: value.mobile } });
  if (value.terms) await recordAcceptance(userId, value.terms);
}
