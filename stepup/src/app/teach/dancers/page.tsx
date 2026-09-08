import { requireRole } from "@/lib/session";
import { HostDancersPage } from "@/components/host/HostDancersPage";

export const metadata = { title: "Dancers, StepUp" };

export default async function TeachDancersPage() {
  const user = await requireRole("INSTRUCTOR");
  return <HostDancersPage hostId={user.id} />;
}
