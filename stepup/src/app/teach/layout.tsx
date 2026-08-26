import { requireRole } from "@/lib/session";
import { AppChrome, hostNav } from "@/components/shell/AppChrome";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("INSTRUCTOR");
  return (
    <AppChrome items={hostNav("/teach")} user={{ name: user.name ?? "You" }}>
      {children}
    </AppChrome>
  );
}
