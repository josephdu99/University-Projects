import { db } from "@/lib/db";
import { checkUnsubscribe } from "@/lib/signed-links";

/** Record "no more offers from this studio" for a signed link. False if the link isn't genuine. */
export async function optOutFromLink(userId: string, studioId: string, sig: string): Promise<boolean> {
  if (!checkUnsubscribe(userId, studioId, sig)) return false;
  const [user, studio] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }),
    db.studio.findUnique({ where: { id: studioId }, select: { id: true } }),
  ]);
  if (!user || !studio) return false;
  await db.studioOptOut.upsert({
    where: { studioId_userId: { studioId, userId } },
    create: { studioId, userId },
    update: {},
  });
  // Course updates are kept by email address, so stop those too.
  await db.courseInterest.deleteMany({ where: { studioId, email: user.email } });
  return true;
}
