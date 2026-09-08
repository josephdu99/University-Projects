import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { HostCreateClassPage } from "@/components/host/HostCreateClassPage";

export const metadata = { title: "Create a class, StepUp" };

export default async function StudioNewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await requireRole("STUDIO_OWNER");
  const [{ from }, studio, payout] = await Promise.all([
    searchParams,
    db.studio.findUniqueOrThrow({ where: { ownerId: user.id } }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <HostCreateClassPage
      hostId={user.id}
      base="/studio"
      timezone={studio.timezone}
      canCharge={Boolean(payout?.chargesEnabled)}
      from={from}
    />
  );
}
