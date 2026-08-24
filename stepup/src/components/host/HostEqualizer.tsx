import { C } from "@/lib/marketing-theme";

/** Bar heights from the comp — irregular on purpose, so it reads as a level meter. */
const HERO_HEIGHTS = [40, 68, 30, 84, 52, 96, 44, 72, 36, 88, 58, 78, 34, 62];
const EMPTY_HEIGHTS = [16, 30, 22, 40, 24, 34, 18];

/**
 * The same looping bar motif as the login panel, reused here.
 * Purely decorative — hidden from assistive tech, and held still by the
 * reduced-motion rule in globals.css.
 */
export function HostEqualizer({
  variant,
}: {
  variant: "hero" | "empty";
}) {
  const hero = variant === "hero";
  const heights = hero ? HERO_HEIGHTS : EMPTY_HEIGHTS;

  return (
    <div
      aria-hidden
      style={
        hero
          ? {
              position: "absolute",
              right: 44,
              bottom: 0,
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              height: 120,
              opacity: 0.22,
              pointerEvents: "none",
            }
          : {
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 5,
              height: 40,
              marginBottom: 22,
              opacity: 0.5,
            }
      }
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="stepup-host-eq"
          style={{
            width: hero ? 8 : 7,
            height: h,
            borderRadius: 4,
            background: hero ? C.darkEq : "oklch(80% 0.08 55)",
            transformOrigin: "bottom",
            animation: hero
              ? `stepup-bar-bounce ${1.1 + (i % 5) * 0.22}s ease-in-out ${i * 0.07}s infinite`
              : `stepup-bar-bounce ${1.3 + (i % 4) * 0.2}s ease-in-out ${i * 0.09}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
