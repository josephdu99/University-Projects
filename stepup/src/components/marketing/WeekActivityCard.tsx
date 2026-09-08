import { C, DISPLAY } from "@/lib/marketing-theme";
import { CountUp } from "./CountUp";

/**
 * The landing page's "show, don't tell" widget: a sample week, rendered as the
 * real UI rather than described in bullet points.
 *
 * The figures are illustrative, not anybody's actual week — which is why the
 * card announces itself as an example to screen readers, and why the rank chip
 * says "on StepUp" rather than naming a studio. The app ranks dancers across
 * the whole platform each week; there is no per-studio ranking to point at.
 */

const DAYS = [
  { label: "M", pct: 100 },
  { label: "T", pct: 70 },
  { label: "W", pct: 100 },
  { label: "T", pct: 40 },
  { label: "F", pct: 100 },
  { label: "S", pct: 85 },
  { label: "S", pct: 0 },
];

const SAMPLE_STREAK = 12;

export function WeekActivityCard() {
  return (
    <div
      role="img"
      aria-label="Example of a dancer's week on StepUp: a 12-week streak, six days danced, and second place this week."
      style={{
        background: "oklch(18% 0.015 60)",
        border: "1px solid oklch(97% 0.01 70 / 0.08)",
        borderRadius: 28,
        padding: "clamp(22px, 3.5vw, 32px)",
        maxWidth: 420,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>
          This week
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 20,
            color: C.gold,
          }}
        >
          <span
            className="stepup-flame"
            style={{
              display: "inline-block",
              animation: "stepup-flame-pop 1.8s ease-in-out infinite",
            }}
          >
            🔥
          </span>
          <CountUp to={SAMPLE_STREAK} durationMs={SAMPLE_STREAK * 90} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          height: 88,
          marginBottom: 28,
        }}
      >
        {DAYS.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: 10,
                height: "100%",
                borderRadius: 6,
                background: "oklch(97% 0.01 70 / 0.1)",
                display: "flex",
                alignItems: "flex-end",
                overflow: "hidden",
              }}
            >
              <div
                className="stepup-day-bar"
                style={{
                  width: "100%",
                  height: `${d.pct}%`,
                  borderRadius: 6,
                  background: d.pct > 0 ? C.gold : "transparent",
                  transformOrigin: "bottom",
                  animation: `stepup-bar-fill 0.6s ease-out ${i * 0.08}s backwards`,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "oklch(70% 0.015 70)" }}>
              {d.label}
            </div>
          </div>
        ))}
      </div>

      <div
        className="stepup-rank-chip"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 14,
          background: "oklch(78% 0.15 85 / 0.12)",
          animation: "stepup-rank-pulse 2.4s ease-in-out infinite",
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 15,
            color: C.gold,
          }}
        >
          #2
        </div>
        <div style={{ fontSize: 13.5, color: "oklch(90% 0.01 70)" }}>
          on StepUp this week, one spot from the top.
        </div>
      </div>
    </div>
  );
}
