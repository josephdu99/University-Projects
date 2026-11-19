import { db } from "@/lib/db";
import {
  completeness,
  profileChecklist,
  tierFor,
  tierRank,
  type ProfileFacts,
} from "@/lib/profile-completeness";

/**
 * The facts the completeness meter is worked out from, for many studios at
 * once (the matcher ranks classes from every studio in one go).
 */
export async function studioProfileFacts(studioIds: string[]): Promise<Map<string, ProfileFacts>> {
  const ids = [...new Set(studioIds)];
  const out = new Map<string, ProfileFacts>();
  if (ids.length === 0) return out;

  const studios = await db.studio.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      description: true,
      styles: true,
      address: true,
      profileApprovedAt: true,
      owner: { select: { payoutAccount: { select: { chargesEnabled: true } } } },
      _count: {
        select: {
          photos: { where: { draft: false } },
          levelNames: true,
          terms: true,
        },
      },
      classes: {
        where: { startTime: { gte: new Date() }, cancelledAt: null, listing: { not: "HIDDEN" } },
        select: { id: true },
        take: 1,
      },
    },
  });

  for (const s of studios) {
    out.set(s.id, {
      bioLength: s.description.trim().length,
      photos: s._count.photos,
      styles: s.styles.length,
      levelsMapped: s._count.levelNames,
      hasVenue: s.address.trim().length > 0,
      termsPublished: s._count.terms > 0,
      payoutsConnected: Boolean(s.owner.payoutAccount?.chargesEnabled),
      classListed: s.classes.length > 0,
      approved: s.profileApprovedAt !== null,
    });
  }
  return out;
}

export async function studioTierRanks(studioIds: string[]): Promise<Map<string, number>> {
  const facts = await studioProfileFacts(studioIds);
  const ranks = new Map<string, number>();
  for (const [id, f] of facts) ranks.set(id, tierRank(tierFor(completeness(profileChecklist(f)))));
  return ranks;
}
