import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDIO_OWNER");
  return <AppShell user={user}>{children}</AppShell>;
}
