import Link from "next/link";
import { C } from "@/lib/marketing-theme";
import { Wordmark } from "@/components/first-class/FunnelChrome";

const LINK = {
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "0.12em",
  color: C.ink,
  textDecoration: "none",
} as const;

/**
 * Header for the studio and teacher sign-up pages: the wordmark with who the
 * page is for, then a way across to the other path and a way in.
 */
export function OnboardingHeader({
  tag,
  links,
}: {
  tag: string;
  links: { href: string; label: string }[];
}) {
  return (
    <header
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "20px clamp(20px, 5vw, 48px)",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <Link
        href="/"
        aria-label="StepUp home"
        style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
      >
        <Wordmark />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "oklch(45% 0.02 60)",
            marginLeft: 4,
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </span>
      </Link>
      <nav style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="stepup-text-link" style={LINK}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
