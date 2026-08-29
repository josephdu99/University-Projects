import { requireRole } from "@/lib/session";
import { HostShell } from "@/components/host/HostShell";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("INSTRUCTOR");
  return (
    <HostShell base="/teach" user={{ name: user.name ?? "You", role: user.role }}>
      {children}
    </HostShell>
  );
}
