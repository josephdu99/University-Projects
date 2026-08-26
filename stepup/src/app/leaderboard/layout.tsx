import { requireRole } from "@/lib/session";
import { AppChrome, DANCER_NAV } from "@/components/shell/AppChrome";

/**
 * STUDENT only, and deliberately so: "studios cannot see your position" is one
 * of the four promises the board's own footer makes, and a role gate is the
 * only way to keep it true.
 */
export default async function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  return (
    <AppChrome
      items={DANCER_NAV}
      user={{ name: user.name ?? "You" }}
      maxWidth={1000}
    >
      {children}
    </AppChrome>
  );
}
