import { requireAdmin } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return <AppShell user={user}>{children}</AppShell>;
}
