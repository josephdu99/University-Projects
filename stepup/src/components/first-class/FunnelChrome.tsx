import Link from "next/link";
import type { ReactNode } from "react";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";

/**
 * The wordmark used across the first-timer funnel. The handoff draws it as a
 * small stepped glyph beside the name, so it is an inline SVG rather than a
 * font trick.
 */
export function Wordmark({
  size = 24,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        color: onDark ? C.heroCream : C.ink,
      }}
    >
      <svg
        aria-hidden
        width={size * 1.08}
        height={size * 0.92}
        viewBox="0 0 26 22"
        style={{ display: "block" }}
      >
        <path d="M0 22V15H8V8H16V0H26V22Z" fill={C.heroBg} />
      </svg>
      <span>
        Step<span style={{ color: "oklch(55% 0.17 38)" }}>Up</span>
      </span>
    </span>
  );
}

/**
 * Header for the public funnel pages. `user` decides whether the right-hand
 * side offers a way in or a way back to the app, the same rule the landing
 * page follows.
 */
export function FunnelHeader({
  home,
  homeLabel,
  width = 1280,
  compact = false,
}: {
  home: string | null;
  homeLabel: string | null;
  width?: number;
  compact?: boolean;
}) {
  return (
    <header
      style={{
        maxWidth: width,
        margin: "0 auto",
        padding: "20px clamp(20px, 5vw, 64px)",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Link href="/" aria-label="StepUp home" style={{ textDecoration: "none" }}>
        <Wordmark size={compact ? 20 : 24} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(14px, 2.5vw, 28px)" }}>
        {home ? (
          <Link
            href={home}
            style={{
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.12em",
              padding: "11px 18px",
              borderRadius: 999,
              background: C.heroBg,
              color: C.onBrand,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            BACK TO {homeLabel!.toUpperCase()}
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.12em",
                color: C.ink,
                textDecoration: "none",
              }}
            >
              LOG IN
            </Link>
            <Link
              href="/signup"
              style={{
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.12em",
                padding: "11px 18px",
                borderRadius: 999,
                background: C.heroBg,
                color: C.onBrand,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              GET STARTED
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function FunnelFooter() {
  return (
    <div
      style={{
        padding: "24px clamp(20px, 5vw, 64px)",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        fontSize: 13,
        color: "oklch(50% 0.02 60)",
      }}
    >
      <span style={{ fontFamily: DISPLAY, fontWeight: 800 }}>StepUp</span>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Link href="/legal/terms" style={{ color: "inherit", textDecoration: "none" }}>
          Terms
        </Link>
        <Link href="/legal/privacy" style={{ color: "inherit", textDecoration: "none" }}>
          Privacy
        </Link>
        <span>© {new Date().getFullYear()} StepUp</span>
      </div>
    </div>
  );
}

/** Page wrapper: the funnel's fonts, ground and ink in one place. */
export function FunnelPage({ children }: { children: ReactNode }) {
  return (
    <div
      className={marketingFontClass}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}

/** The eyebrow used above every funnel heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.14em",
        color: "oklch(55% 0.17 38)",
      }}
    >
      {children}
    </div>
  );
}
