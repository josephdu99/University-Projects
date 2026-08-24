import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { HostDashboard } from "@/components/host/HostDashboard";
import { VerifyBanner } from "@/components/VerifyBanner";

export const metadata = { title: "Teaching — StepUp" };

export default async function TeachDashboardPage() {
  const user = await requireRole("INSTRUCTOR");

  const [record, payout] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, displayName: true, timezone: true },
    }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <VerifyBanner verified={user.verified} />
      </div>

      <HostDashboard
        hostId={user.id}
        base="/teach"
        title={publicName(record)}
        // An independent instructor has no venue, so the slot a studio uses for
        // its street address carries the equivalent orienting line.
        metaPrimary="Streaming online — no studio required"
        timezone={record.timezone}
        payoutsConnected={Boolean(payout?.chargesEnabled && payout?.payoutsEnabled)}
        editHref="/profile"
      />
    </>
  );
}
