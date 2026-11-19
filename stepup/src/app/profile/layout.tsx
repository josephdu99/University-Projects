import { requireUser } from "@/lib/session";
import { getStudioAccess } from "@/lib/studio-access";
import { AppChrome, DANCER_NAV, hostNav, studioNav } from "@/components/shell/AppChrome";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Profile is the one page every role shares. Hosts keep the studio nav here
  // rather than being dropped into the dancer shell mid-session.
  const studio = user.role === "STUDIO_OWNER" ? await getStudioAccess(user.id) : null;
  const items = studio
    ? studioNav(studio.isAccountHolder)
    : user.role === "INSTRUCTOR" || user.role === "STUDIO_OWNER"
      ? hostNav(user.role === "STUDIO_OWNER" ? "/studio" : "/teach")
      : DANCER_NAV;

  return (
    <AppChrome items={items} user={{ name: user.name ?? "You", mark: user.avatarMark, color: user.avatarColor }} maxWidth={1000}>
      {children}
    </AppChrome>
  );
}
