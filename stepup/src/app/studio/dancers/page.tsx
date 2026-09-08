import { requireRole } from "@/lib/session";
import { HostDancersPage } from "@/components/host/HostDancersPage";

export const metadata = { title: "Dancers, StepUp" };

export default async function StudioDancersPage() {
  const user = await requireRole("STUDIO_OWNER");
  return <HostDancersPage hostId={user.id} />;
}
