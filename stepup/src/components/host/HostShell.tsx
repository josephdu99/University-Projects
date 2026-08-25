import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import { HostNavLink } from "./HostNavLink";

/**
 * Shell for the studio / instructor side of the app.
 *
 * Deliberately not the dancer AppShell: the host pages now follow the
 * marketing design system (Sora + Work Sans, warm palette, initials avatars)
 * while the dancer app still uses the older in-app theme.
 */
export function HostShell({
  base,
  user,
  children,
}: {
  /** "/studio" or "/teach" — the same nav serves both host types. */
  base: "/studio" | "/teach";
  user: { name: string; role: string };
  children: ReactNode;
}) {
  const items = [
    { href: base, label: base === "/studio" ? "Studio" : "Teaching" },
    { href: `${base}/classes`, label: "Classes" },
    { href: `${base}/dancers`, label: "Dancers" },
    { href: "/profile", label: "Profile" },
  ];

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
              <HostNavLink key={item.href} href={item.href} label={item.label} />
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
          maxWidth: 1120,
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
