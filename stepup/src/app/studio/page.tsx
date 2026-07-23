import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { HostClassList } from "@/components/classes/HostClassList";

export default async function StudioDashboardPage() {
  const user = await requireRole("STUDIO_OWNER");

  const studio = await db.studio.findUniqueOrThrow({ where: { ownerId: user.id } });

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {studio.emoji} Your studio
        </p>
        <h1 className="text-2xl font-extrabold text-ink">{studio.name}</h1>
        <p className="text-sm text-ink-soft">
          {studio.address}, {studio.city}
        </p>
      </Card>

      <HostClassList hostId={user.id} basePath="/studio" />
    </div>
  );
}
