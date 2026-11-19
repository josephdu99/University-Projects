import { requireStudioAccess } from "@/lib/studio-access";
import { HostDancersPage } from "@/components/host/HostDancersPage";

export const metadata = { title: "Dancers, StepUp" };

export default async function StudioDancersPage() {
  const { studio } = await requireStudioAccess();
  return <HostDancersPage hostId={studio.ownerId} />;
}
