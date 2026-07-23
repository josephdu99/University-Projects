import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  return <AppShell user={user}>{children}</AppShell>;
}
