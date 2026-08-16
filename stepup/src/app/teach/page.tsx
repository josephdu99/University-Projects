import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { Card } from "@/components/ui/Card";
import { HostClassList } from "@/components/classes/HostClassList";
import { VerifyBanner } from "@/components/VerifyBanner";

export default async function TeachDashboardPage() {
  const user = await requireRole("INSTRUCTOR");

  const [record, payout] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, displayName: true, timezone: true, bio: true },
    }),
    db.payoutAccount.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <VerifyBanner verified={user.verified} />

      <Card className="flex flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          🎥 Independent instructor
        </p>
        <h1 className="text-2xl font-extrabold text-ink">{publicName(record)}</h1>
        <p className="text-sm text-ink-soft">
          Your classes stream online — no studio required.
        </p>
        <p className="text-xs text-ink-soft">
          Class times in {record.timezone.replace(/_/g, " ")}
        </p>
      </Card>

      <HostClassList
        hostId={user.id}
        basePath="/teach"
        fixedFormat="ONLINE"
        timezone={record.timezone}
        canCharge={Boolean(payout?.chargesEnabled)}
      />
    </div>
  );
}
