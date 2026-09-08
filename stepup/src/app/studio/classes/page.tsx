import { requireRole } from "@/lib/session";
import { HostClassesPage } from "@/components/host/HostClassesPage";

export const metadata = { title: "Classes, StepUp" };

export default async function StudioClassesPage() {
  const user = await requireRole("STUDIO_OWNER");
  return <HostClassesPage hostId={user.id} base="/studio" />;
}
