import { db } from "@/lib/db";
import { POLICIES, type PolicyId } from "@/lib/policies";

/**
 * Studio terms. Students accept once per studio, at their first booking, and
 * again only when the studio publishes a new version. Which version and when
 * are stored, and shown back on the confirmation.
 */
export async function currentTerms(studioId: string | null | undefined) {
  if (!studioId) return null;
  return db.studioTerms.findFirst({
    where: { studioId },
    orderBy: { version: "desc" },
    include: { document: { select: { id: true, filename: true } } },
  });
}

export async function acceptanceOf(userId: string, termsId: string) {
  return db.termsAcceptance.findUnique({ where: { userId_termsId: { userId, termsId } } });
}

/** Record acceptance; a repeat (double submit) keeps the first time. */
export async function recordAcceptance(userId: string, terms: { id: string; studioId: string; version: number }) {
  return db.termsAcceptance.upsert({
    where: { userId_termsId: { userId, termsId: terms.id } },
    create: { userId, termsId: terms.id, studioId: terms.studioId, version: terms.version },
    update: {},
  });
}

/** The template's sections, in the words students read at checkout. */
export function templateSections(
  terms: { waiver: boolean; conduct: boolean; cancellation: boolean },
  policy: PolicyId,
): { title: string; body: string }[] {
  const p = POLICIES[policy];
  return [
    terms.waiver && {
      title: "Waiver",
      body: "Dance is physical activity. Take part at your own pace and tell your teacher if you need to sit out.",
    },
    terms.conduct && {
      title: "Code of conduct",
      body: "Ask before any partner work beyond the basic hold. Anyone can say no to a partner, any time.",
    },
    terms.cancellation && {
      title: `Cancellation (${p.label})`,
      body: `Free until ${p.until} class. After that, ${p.after}.`,
    },
  ].filter(Boolean) as { title: string; body: string }[];
}

/** "waiver, code of conduct and cancellation policy" */
export function termsListLabel(t: { mode: string; waiver: boolean; conduct: boolean; cancellation: boolean }): string {
  if (t.mode === "UPLOAD") return "terms";
  const parts = [t.waiver && "waiver", t.conduct && "code of conduct", t.cancellation && "cancellation policy"].filter(
    Boolean,
  ) as string[];
  if (parts.length === 0) return "terms";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
