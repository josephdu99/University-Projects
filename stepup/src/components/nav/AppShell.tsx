import type { ReactNode } from "react";
import { TopBar } from "@/components/nav/TopBar";
import { BottomNav, type NavItem } from "@/components/nav/BottomNav";
import type { Role } from "@/lib/roles";

const NAV_ITEMS: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/discover", label: "Discover", emoji: "🔥" },
    { href: "/schedule", label: "Schedule", emoji: "📅" },
    { href: "/leaderboard", label: "Leaderboard", emoji: "🏆" },
    { href: "/profile", label: "Profile", emoji: "🙂" },
  ],
  STUDIO_OWNER: [
    { href: "/studio", label: "Dashboard", emoji: "🏢" },
    { href: "/profile", label: "Profile", emoji: "🙂" },
  ],
  INSTRUCTOR: [
    { href: "/teach", label: "Dashboard", emoji: "🎥" },
    { href: "/profile", label: "Profile", emoji: "🙂" },
  ],
  ADMIN: [
    { href: "/admin", label: "Admin", emoji: "🛡️" },
    { href: "/discover", label: "Discover", emoji: "🔥" },
    { href: "/profile", label: "Profile", emoji: "🙂" },
  ],
};

export function AppShell({
  user,
  children,
}: {
  user: {
    name?: string | null;
    role: Role;
    avatarEmoji: string;
    avatarColor: string;
  };
  children: ReactNode;
}) {
  const items = NAV_ITEMS[user.role];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar items={items} user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pb-10">
        {children}
      </main>
      <BottomNav items={items} />
    </div>
  );
}
