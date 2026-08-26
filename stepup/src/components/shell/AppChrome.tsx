import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import { NavLink } from "./NavLink";

export type NavItem = { href: string; label: string; exact?: boolean };

/** Studio owners and independent instructors share one nav; only the root differs. */
export function hostNav(base: "/studio" | "/teach"): NavItem[] {
  return [
    { href: base, label: base === "/studio" ? "Studio" : "Teaching", exact: true },
    { href: `${base}/classes`, label: "Classes" },
    { href: `${base}/dancers`, label: "Dancers" },
    { href: "/profile", label: "Profile" },
  ];
}

export const DANCER_NAV: NavItem[] = [
  { href: "/discover", label: "Discover" },
  { href: "/schedule", label: "My classes" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

/**
 * The sticky page chrome shared by every page on the redesigned system —
 * studio, teaching, profile and the leaderboard. One component so the nav,
 * wordmark and account block cannot drift apart between sections.
 *
 * `maxWidth` is the only thing that varies: the host dashboards run wide,
 * the leaderboard's column is 1000px per its handoff.
 */
export function AppChrome({
  items,
  user,
  maxWidth = 1120,
  children,
}: {
  items: NavItem[];
  user: { name: string };
  maxWidth?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={marketingFontClass}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          padding: "18px clamp(20px, 5vw, 48px)",
          background: "oklch(97.5% 0.012 70 / 0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(20px, 4vw, 40px)",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: C.ink,
              textDecoration: "none",
            }}
          >
            StepUp
          </Link>
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(16px, 2.5vw, 26px)",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {items.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14 }}>
              {user.name}
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: C.label,
                  cursor: "pointer",
                }}
              >
                Log out
              </button>
            </form>
          </div>
          <div
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: C.brand,
              color: C.onBrand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 15,
              flex: "none",
            }}
          >
            {initialsOf(user.name)}
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth,
          width: "100%",
          margin: "0 auto",
          padding: "36px clamp(20px, 5vw, 48px) 96px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
