import { requireStudioAccess } from "@/lib/studio-access";
import { HostClassesPage } from "@/components/host/HostClassesPage";

export const metadata = { title: "Classes, StepUp" };

export default async function StudioClassesPage() {
  const { studio } = await requireStudioAccess();
  // Studio classes are hosted by the studio's account, whoever is looking.
  return <HostClassesPage hostId={studio.ownerId} base="/studio" />;
}
