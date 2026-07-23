import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Avatar } from "@/components/ui/Avatar";
import type { NavItem } from "@/components/nav/BottomNav";

export function TopBar({
  items,
  user,
}: {
  items: NavItem[];
  user: { name?: string | null; avatarEmoji: string; avatarColor: string };
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-ink">
          <span className="text-2xl">🕺</span>
          <span className="text-lg tracking-tight">StepUp</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <span className="mr-1.5">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size="sm" />
            <span className="hidden text-sm font-semibold text-ink sm:inline">
              {user.name}
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="hidden text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:inline"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
