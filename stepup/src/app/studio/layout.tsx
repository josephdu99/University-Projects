import { requireRole } from "@/lib/session";
import { AppChrome, hostNav } from "@/components/shell/AppChrome";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDIO_OWNER");
  return (
    <AppChrome items={hostNav("/studio")} user={{ name: user.name ?? "You" }}>
      {children}
    </AppChrome>
  );
}
