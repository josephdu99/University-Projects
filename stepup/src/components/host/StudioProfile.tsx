import { C, DISPLAY } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import type { StudioProfileData } from "@/lib/studio-profile";

/** The read-only half of a studio owner's profile. */
export function StudioProfileHeader({
  name,
  role,
  city,
  studioName,
  avatarColor,
  verified,
  data,
}: {
  name: string;
  role: string;
  city: string | null;
  studioName: string | null;
  avatarColor: string;
  verified: boolean;
  data: StudioProfileData;
}) {
  const since = [studioName, data.hostingSince && `hosting since ${data.hostingSince}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 28,
          marginBottom: 20,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 104,
            height: 104,
            flex: "none",
            borderRadius: 999,
            background: avatarColor,
            color: C.onBrand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 36,
            letterSpacing: "-0.02em",
          }}
        >
          {initialsOf(name)}
        </div>

        <div style={{ flex: "1 1 320px" }}>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(32px, 5vw, 40px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            {name}
          </h1>
          <div
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}
          >
            <span
              style={{
                ...tag,
                background: "oklch(24% 0.02 60)",
                color: C.onDark,
              }}
            >
              {role}
            </span>
            {city && (
              <span
                style={{
                  ...tag,
                  background: "oklch(93% 0.03 70)",
                  color: "oklch(38% 0.04 60)",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <path
                    d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                {city}
              </span>
            )}
            {since && (
              <span style={{ fontSize: 15, color: C.navInactive }}>{since}</span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                padding: "4px 11px",
                borderRadius: 7,
                border: "1.2px solid oklch(87% 0.014 70)",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "oklch(45% 0.02 60)",
              }}
            >
              {verified && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    stroke="oklch(52% 0.1 145)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {verified ? "Email verified" : "Email unverified"}
            </span>
          </div>
        </div>
      </section>

      <section
        style={{
          background: C.ink,
          color: C.onDark,
          borderRadius: 28,
          padding: "36px clamp(22px, 4vw, 40px)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 26,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "5px 13px",
                borderRadius: 999,
                background: C.darkChip,
                color: C.darkChipInk,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.06em",
                marginBottom: 14,
              }}
            >
              WHERE YOUR STUDIO IS
            </div>
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 30,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {data.headline}
            </h2>
          </div>
          <p
            style={{
              flex: "1 1 280px",
              maxWidth: 340,
              fontSize: 15,
              color: C.onDarkBody,
              margin: 0,
            }}
          >
            {data.note}
          </p>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap", marginBottom: 30 }}
        >
          {data.stages.map((stage, i) => (
            <div key={stage.label} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  whiteSpace: "nowrap",
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  background:
                    stage.state === "current" ? C.brand : "oklch(97% 0.01 70 / 0.08)",
                  color:
                    stage.state === "current"
                      ? C.onBrand
                      : stage.state === "done"
                        ? C.onDark
                        : "oklch(65% 0.015 70)",
                }}
              >
                {stage.label}
              </div>
              {i < data.stages.length - 1 && (
                <div aria-hidden style={{ padding: "0 12px", color: "oklch(55% 0.02 60)" }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            background: "oklch(18% 0.015 60)",
            border: "1px solid oklch(97% 0.01 70 / 0.08)",
            borderRadius: 20,
            padding: "24px 26px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>
              Last 4 weeks
            </div>
            <div id="studio-weeks" style={{ fontSize: 13.5, color: "oklch(75% 0.015 70)" }}>
              {data.weeksLine}
            </div>
          </div>
          <div role="img" aria-labelledby="studio-weeks" style={{ display: "flex", gap: 8 }}>
            {data.weeks.map((on, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 12,
                  borderRadius: 6,
                  background: "oklch(97% 0.01 70 / 0.1)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="stepup-grow"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 6,
                    background: on ? C.brand : "transparent",
                    transformOrigin: "left",
                    animationDelay: `${(i * 0.1).toFixed(1)}s`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-label="Your studio in numbers"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {data.stats.map((s) => (
          <article
            key={s.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 24,
              padding: "24px 26px",
            }}
          >
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: C.label,
                marginBottom: 10,
              }}
            >
              {s.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
              <span
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </span>
              <span style={{ fontSize: 13.5, color: C.label }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 13, color: C.meta, marginTop: 12 }}>{s.note}</div>
          </article>
        ))}
      </section>
    </>
  );
}

const tag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 700,
};
