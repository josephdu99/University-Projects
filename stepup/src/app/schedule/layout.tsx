import { requireRole } from "@/lib/session";
import { AppChrome, DANCER_NAV } from "@/components/shell/AppChrome";

export default async function ScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  return (
    <AppChrome items={DANCER_NAV} user={{ name: user.name ?? "You", mark: user.avatarMark, color: user.avatarColor }} maxWidth={1000}>
      {children}
    </AppChrome>
  );
}
