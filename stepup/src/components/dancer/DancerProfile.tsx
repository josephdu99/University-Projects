import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import type { DancerProfileData } from "@/lib/dancer-profile";

/**
 * The read-only half of the dancer profile: who you are, where you have got
 * to, and the story the attendance record can actually tell.
 */
export function DancerProfile({
  name,
  city,
  avatarColor,
  verified,
  data,
}: {
  name: string;
  city: string | null;
  avatarColor: string;
  verified: boolean;
  data: DancerProfileData;
}) {
  return (
    <>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 28,
          marginBottom: 4,
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
            fontSize: 38,
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
              fontSize: "clamp(30px, 5vw, 40px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            {name}
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
            }}
          >
            {city && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "oklch(24% 0.02 60)",
                  color: C.onDark,
                  fontSize: 12.5,
                  fontWeight: 700,
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
            {data.dancingSince && (
              <span style={{ fontSize: 15, color: C.navInactive }}>
                Dancing since {data.dancingSince}
              </span>
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
              {verified ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    stroke="oklch(52% 0.1 145)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
              {verified ? "Email verified" : "Email unverified"}
            </span>
          </div>
        </div>
      </header>

      <section
        style={{
          background: C.ink,
          color: C.onDark,
          borderRadius: 28,
          padding: "36px clamp(22px, 4vw, 40px)",
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
              WHERE YOU ARE
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
            {data.summary}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 30,
          }}
        >
          {data.journey.map((step, i) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  whiteSpace: "nowrap",
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  background:
                    step.state === "current" ? C.brand : "oklch(97% 0.01 70 / 0.08)",
                  color:
                    step.state === "current"
                      ? C.onBrand
                      : step.state === "done"
                        ? C.onDark
                        : "oklch(65% 0.015 70)",
                }}
              >
                {step.label}
              </div>
              {i < data.journey.length - 1 && (
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
            <b style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>
              Last 4 weeks
            </b>
            <span id="weeks-line" style={{ fontSize: 13.5, color: "oklch(75% 0.015 70)" }}>
              {data.weeksLine}
            </span>
          </div>
          <div
            role="img"
            aria-labelledby="weeks-line"
            style={{ display: "flex", gap: 8 }}
          >
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
                <i
                  className="stepup-grow"
                  style={{
                    display: "block",
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
        aria-label="Your totals"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
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
              <b
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </b>
              <span style={{ fontSize: 13.5, color: C.label }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 13, color: "oklch(55% 0.02 60)", marginTop: 12 }}>
              {s.note}
            </div>
          </article>
        ))}
      </section>

      <Panel>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 26,
          }}
        >
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, margin: 0 }}>
            Your story so far
          </h2>
          <span style={{ fontSize: 13.5, color: C.label }}>{data.statsCaption}</span>
        </div>

        {data.moments.length === 0 ? (
          <p style={{ fontSize: 14.5, color: C.label, margin: 0 }}>
            Your first class will start this off.
          </p>
        ) : (
          data.moments.map((m, i) => {
            const last = i === data.moments.length - 1;
            return (
              <div key={`${m.when}-${m.title}`} style={{ display: "flex", gap: 20 }}>
                <div
                  style={{
                    flex: "none",
                    width: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      flex: "none",
                      marginTop: 5,
                      borderRadius: 999,
                      background: last ? C.brand : C.card,
                      border: `2.5px solid ${last ? C.brand : "oklch(84% 0.02 70)"}`,
                    }}
                  />
                  {!last && (
                    <div style={{ flex: 1, width: 1.5, background: "oklch(92% 0.01 70)" }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: last ? 4 : 26 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "oklch(58% 0.02 60)",
                      marginBottom: 5,
                    }}
                  >
                    {m.when}
                  </div>
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 17,
                      marginBottom: 3,
                    }}
                  >
                    {m.title}
                  </div>
                  <p style={{ fontSize: 14.5, color: "oklch(50% 0.02 60)", margin: 0 }}>
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {data.nextStep && (
          <div
            style={{
              marginTop: 8,
              padding: "18px 20px",
              borderRadius: 18,
              background: C.nudgeBg,
              border: `1px solid ${C.nudgeBorder}`,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <p style={{ fontSize: 14.5, color: C.nudgeInk, margin: 0 }}>
              {data.nextStep.text}
            </p>
            <Link
              href={data.nextStep.href}
              style={{
                whiteSpace: "nowrap",
                fontWeight: 700,
                fontSize: 14.5,
                padding: "11px 20px",
                borderRadius: 999,
                background: C.brand,
                color: C.onBrand,
                textDecoration: "none",
              }}
            >
              {data.nextStep.cta}
            </Link>
          </div>
        )}
      </Panel>
    </>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: "32px clamp(22px, 4vw, 36px)",
      }}
    >
      {children}
    </section>
  );
}
