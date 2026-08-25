import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { HostDashboard } from "@/components/host/HostDashboard";
import { VerifyBanner } from "@/components/VerifyBanner";

export const metadata = { title: "Studio — StepUp" };

export default async function StudioDashboardPage() {
  const user = await requireRole("STUDIO_OWNER");

  const [studio, payout] = await Promise.all([
    db.studio.findUniqueOrThrow({ where: { ownerId: user.id } }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <VerifyBanner verified={user.verified} />
      </div>

      <HostDashboard
        hostId={user.id}
        title={studio.name}
        addressLine={`${studio.address}, ${studio.city}`}
        timezone={studio.timezone}
        payoutsConnected={Boolean(payout?.chargesEnabled && payout?.payoutsEnabled)}
      />
    </>
  );
}
