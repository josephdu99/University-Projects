import { APP_ENV, ENV_LABEL, isProduction } from "@/lib/environment";

/**
 * A fixed corner marker on anything that is not Production, so a test
 * deployment can never be mistaken for the live site — including in a
 * screenshot, which is how that mistake usually gets made.
 *
 * Renders nothing at all in Production.
 */
export function EnvironmentRibbon() {
  if (isProduction) return null;

  const test = APP_ENV === "test";

  return (
    <div
      // Bottom-left keeps it clear of the sticky nav and the Next dev tools.
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: 999,
        background: test ? "oklch(58% 0.17 35)" : "oklch(35% 0.04 60)",
        color: "oklch(99% 0.005 70)",
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        boxShadow: "0 2px 10px oklch(22% 0.02 60 / 0.25)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: "oklch(99% 0.005 70)",
          opacity: 0.9,
        }}
      />
      {ENV_LABEL[APP_ENV]}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        This is the {ENV_LABEL[APP_ENV]} environment, not the live site.
      </span>
    </div>
  );
}
