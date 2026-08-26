import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";
import { DancerShell } from "@/components/dancer/DancerShell";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Only the dancer profile was redesigned; studio owners, instructors and
  // admins keep the shell and the page they already had.
  if (user.role === "STUDENT") {
    return <DancerShell user={{ name: user.name ?? "You", avatarColor: user.avatarColor }}>{children}</DancerShell>;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
