import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
