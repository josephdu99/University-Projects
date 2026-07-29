import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { HostClassList } from "@/components/classes/HostClassList";
import { VerifyBanner } from "@/components/VerifyBanner";

export default async function StudioDashboardPage() {
  const user = await requireRole("STUDIO_OWNER");

  const [studio, payout] = await Promise.all([
    db.studio.findUniqueOrThrow({ where: { ownerId: user.id } }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <VerifyBanner verified={user.verified} />

      <Card className="flex flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {studio.emoji} Your studio
        </p>
        <h1 className="text-2xl font-extrabold text-ink">{studio.name}</h1>
        <p className="text-sm text-ink-soft">
          {studio.address}, {studio.city}
        </p>
        <p className="text-xs text-ink-soft">
          Class times in {studio.timezone.replace(/_/g, " ")}
        </p>
      </Card>

      <HostClassList
        hostId={user.id}
        basePath="/studio"
        timezone={studio.timezone}
        canCharge={Boolean(payout?.chargesEnabled)}
      />
    </div>
  );
}
