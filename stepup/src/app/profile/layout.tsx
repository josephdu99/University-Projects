import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";
import { AppChrome, hostNav } from "@/components/shell/AppChrome";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Profile is the one page both sides share. Hosts keep the studio nav here
  // rather than being dropped into the dancer shell mid-session.
  if (user.role === "STUDIO_OWNER" || user.role === "INSTRUCTOR") {
    return (
      <AppChrome
        items={hostNav(user.role === "STUDIO_OWNER" ? "/studio" : "/teach")}
        user={{ name: user.name ?? "You" }}
      >
        {children}
      </AppChrome>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
