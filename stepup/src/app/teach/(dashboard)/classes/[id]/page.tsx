import { requireRole } from "@/lib/session";
import { RosterView } from "@/components/classes/RosterView";

export default async function TeachClassRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("INSTRUCTOR");
  const { id } = await params;
  return <RosterView classId={id} hostId={user.id} basePath="/teach" />;
}
