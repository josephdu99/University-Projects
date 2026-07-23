import { requireRole } from "@/lib/session";
import { RosterView } from "@/components/classes/RosterView";

export default async function StudioClassRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("STUDIO_OWNER");
  const { id } = await params;
  return <RosterView classId={id} hostId={user.id} basePath="/studio" />;
}
