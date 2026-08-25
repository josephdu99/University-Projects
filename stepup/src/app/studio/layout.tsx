import { requireRole } from "@/lib/session";
import { HostShell } from "@/components/host/HostShell";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDIO_OWNER");
  return <HostShell user={{ name: user.name ?? "You" }}>{children}</HostShell>;
}
