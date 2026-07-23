import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { HostClassList } from "@/components/classes/HostClassList";

export default async function TeachDashboardPage() {
  const user = await requireRole("INSTRUCTOR");

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          🎥 Independent instructor
        </p>
        <h1 className="text-2xl font-extrabold text-ink">{user.name}</h1>
        <p className="text-sm text-ink-soft">
          Your classes stream online — no studio required.
        </p>
      </Card>

      <HostClassList hostId={user.id} basePath="/teach" fixedFormat="ONLINE" />
    </div>
  );
}
