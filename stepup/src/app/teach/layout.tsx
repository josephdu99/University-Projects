import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("INSTRUCTOR");
  return <AppShell user={user}>{children}</AppShell>;
}
