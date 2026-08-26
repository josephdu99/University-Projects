import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { initialsOf } from "@/lib/style-chips";
import { getDancerProfile } from "@/lib/dancer-profile";
import { formatInTimeZone } from "@/lib/time";
import { EditProfileCard, ChangePasswordCard } from "./ProfileForms";

export async function DancerProfile({
  user,
}: {
  user: {
    id: string;
    name: string;
    homeCity: string | null;
    timezone: string;
    avatarColor: string;
    avatarEmoji: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  };
}) {
  const p = await getDancerProfile(user.id, user.timezone);
  const initials = initialsOf(user.name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── IDENTITY — no card, so the dark panel below carries the weight ── */}
      <div
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
            background: user.avatarColor,
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
          {initials}
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
            {user.name}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            {user.homeCity && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "oklch(24% 0.02 60)",
                  color: "oklch(97% 0.01 70)",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                {user.homeCity}
              </span>
            )}
            <span style={{ fontSize: 15, color: "oklch(48% 0.02 60)" }}>
              Dancing since {formatInTimeZone(user.createdAt, user.timezone, "MMMM yyyy")}
            </span>
            {user.emailVerifiedAt && (
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
                {/* The only green in the palette, and only because a
                    verification tick reads as a system state. */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <path d="M4 12.5l5 5L20 6.5" stroke="oklch(52% 0.1 145)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Email verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── JOURNEY ──────────────────────────────────────────────────────── */}
      <section
        style={{
          background: C.ink,
          color: "oklch(97% 0.01 70)",
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
                fontSize: "clamp(24px, 4vw, 30px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {p.journey.currentIndex === 0
                ? "You're just getting started."
                : p.journey.currentIndex === 1
                  ? "You're a social dancer now."
                  : "You're leading and following with confidence."}
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
            {p.journey.explanation}
          </p>
        </div>

        <ol
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0,
            listStyle: "none",
            padding: 0,
            margin: "0 0 30px",
          }}
        >
          {p.journey.steps.map((label, i) => {
            const current = i === p.journey.currentIndex;
            const done = i < p.journey.currentIndex;
            return (
              <li key={label} style={{ display: "flex", alignItems: "center" }}>
                <span
                  aria-current={current ? "step" : undefined}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "10px 18px",
                    borderRadius: 999,
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 14,
                    background: current ? C.brand : "oklch(97% 0.01 70 / 0.08)",
                    color: current
                      ? C.onBrand
                      : done
                        ? "oklch(97% 0.01 70)"
                        : "oklch(65% 0.015 70)",
                  }}
                >
                  {label}
                </span>
                {i < p.journey.steps.length - 1 && (
                  <span aria-hidden style={{ padding: "0 12px", color: "oklch(55% 0.02 60)" }}>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>

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
            {/* This sentence is the accessible value; the bars are decoration. */}
            <div style={{ fontSize: 13.5, color: "oklch(75% 0.015 70)" }}>
              {p.weeksDanced === 0
                ? "No classes in the last four weeks. The window just rolls on."
                : `You danced in ${p.weeksDanced} of your last 4 weeks.`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }} aria-hidden>
            {p.weeks.map((filled, i) => (
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
                    background: filled ? C.brand : "transparent",
                    transformOrigin: "left",
                    animation: `stepup-seg-grow 0.5s ease-out ${i * 0.1}s both`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
          gap: 16,
        }}
      >
        {p.stats.map((s) => (
          <div
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
                color: "oklch(52% 0.02 60)",
                marginBottom: 10,
              }}
            >
              {s.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 13.5, color: "oklch(52% 0.02 60)" }}>{s.unit}</div>
            </div>
            <div style={{ fontSize: 13, color: "oklch(55% 0.02 60)", marginTop: 12 }}>
              {s.note}
            </div>
          </div>
        ))}
      </section>

      {/* ── STORY ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: "32px clamp(20px, 3vw, 36px)",
        }}
      >
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
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Your story so far
          </h2>
          <span style={{ fontSize: 13.5, color: "oklch(52% 0.02 60)" }}>{p.summary}</span>
        </div>

        {p.moments.length > 0 ? (
          <div>
            {p.moments.map((m, i) => {
              const last = i === p.moments.length - 1;
              return (
                <div key={`${m.when}-${m.title}`} style={{ display: "flex", gap: 20 }}>
                  <div
                    aria-hidden
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
                    <div style={{ fontSize: 14.5, color: "oklch(50% 0.02 60)" }}>{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 14.5, color: "oklch(50% 0.02 60)", margin: "0 0 8px" }}>
            Nothing to tell yet. Your first booking starts this off.
          </p>
        )}

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
          <div style={{ fontSize: 14.5, color: C.nudgeInk }}>{p.nextStep}</div>
          <Link
            href="/discover"
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
            {p.classesDanced === 0 ? "Find a class" : "Find a social"}
          </Link>
        </div>
      </section>

      <EditProfileCard
        defaults={{
          name: user.name,
          homeCity: user.homeCity ?? "",
          timezone: user.timezone,
          avatarColor: user.avatarColor,
          avatarEmoji: user.avatarEmoji,
        }}
      />

      <ChangePasswordCard />
    </div>
  );
}
