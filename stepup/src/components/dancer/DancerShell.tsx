import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import { HostNavLink } from "@/components/host/HostNavLink";

/**
 * Dancer-side chrome, matching the studio shell: text nav with an accent
 * underline on the active item and an initials avatar, no emoji.
 *
 * Leaderboard is listed. The Discover handoff dropped it; the Profile handoff
 * puts it back and explains why — it is the one place ranking is allowed,
 * because it ranks real actions, is opt-in, and resets monthly.
 */
const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/schedule", label: "My classes" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

export function DancerShell({
  user,
  children,
}: {
  user: { name: string; avatarColor?: string };
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
            {NAV.map((item) => (
              <HostNavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: "nowrap",
              }}
            >
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
              flex: "none",
              borderRadius: 999,
              background: user.avatarColor ?? C.brand,
              color: C.onBrand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {initialsOf(user.name)}
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1120,
          width: "100%",
          margin: "0 auto",
          padding: "clamp(28px, 4vw, 44px) clamp(20px, 5vw, 48px) 96px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
