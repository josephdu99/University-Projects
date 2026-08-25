import { requireRole } from "@/lib/session";
import { DancerShell } from "@/components/dancer/DancerShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  return <DancerShell user={{ name: user.name ?? "You" }}>{children}</DancerShell>;
}
