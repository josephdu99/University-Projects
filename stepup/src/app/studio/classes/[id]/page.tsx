import { requireStudioAccess } from "@/lib/studio-access";
import { RosterView } from "@/components/classes/RosterView";

export default async function StudioClassRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { studio } = await requireStudioAccess();
  const { id } = await params;
  return <RosterView classId={id} hostId={studio.ownerId} basePath="/studio" />;
}
