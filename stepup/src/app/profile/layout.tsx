import { requireUser } from "@/lib/session";
import { AppChrome, DANCER_NAV, hostNav } from "@/components/shell/AppChrome";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Profile is the one page every role shares. Hosts keep the studio nav here
  // rather than being dropped into the dancer shell mid-session.
  const host = user.role === "STUDIO_OWNER" || user.role === "INSTRUCTOR";
  const items = host
    ? hostNav(user.role === "STUDIO_OWNER" ? "/studio" : "/teach")
    : DANCER_NAV;

  return (
    <AppChrome items={items} user={{ name: user.name ?? "You" }} maxWidth={1000}>
      {children}
    </AppChrome>
  );
}
