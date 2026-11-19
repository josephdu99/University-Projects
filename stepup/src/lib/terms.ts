import { db } from "@/lib/db";

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

export { templateSections, termsListLabel } from "@/lib/terms-text";
