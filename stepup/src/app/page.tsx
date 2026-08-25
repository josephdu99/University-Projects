import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";
import { TESTIMONIALS } from "@/lib/marketing-content";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { CountUp } from "@/components/marketing/CountUp";

const SECTION_PAD = "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)";
const SHELL = { maxWidth: 1280, margin: "0 auto" } as const;

/** Warm-only, per the palette rule — no cool hues anywhere on this page. */
const STUDIO_SWATCHES = [
  ["oklch(90% 0.05 35)", "oklch(85% 0.05 35)"],
  ["oklch(90% 0.05 55)", "oklch(85% 0.05 55)"],
  ["oklch(90% 0.05 85)", "oklch(85% 0.05 85)"],
  ["oklch(90% 0.05 345)", "oklch(85% 0.05 345)"],
];

export const metadata = {
  title: "StepUp — Book a class in one tap. Become a regular.",
  description:
    "Find dance classes nearby or online, book your spot in one tap, and watch your own rhythm build week by week.",
};

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  // Every figure on this page comes from a query. Nothing is hard-coded.
  const [classCount, styleRows, studios] = await Promise.all([
    db.danceClass.count(),
    db.danceClass.findMany({ select: { style: true }, distinct: ["style"] }),
    db.studio.findMany({
      where: { suspendedAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        _count: {
          select: { classes: { where: { startTime: { gte: new Date() } } } },
        },
      },
    }),
  ]);

  const styleCount = styleRows.length;

  return (
    <div
      className={marketingFontClass}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
      }}
    >
      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px clamp(20px, 5vw, 48px)",
          background: "oklch(97.5% 0.012 70 / 0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.02em",
          }}
        >
          StepUp
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/login"
            style={{
              fontWeight: 600,
              fontSize: 15,
              padding: "10px 18px",
              color: C.ink,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            style={{
              fontWeight: 700,
              fontSize: 15,
              padding: "10px 22px",
              borderRadius: 999,
              background: C.brand,
              color: C.onBrand,
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          ...SHELL,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 56,
          padding: "clamp(48px, 8vw, 88px) clamp(20px, 5vw, 48px) clamp(56px, 9vw, 96px)",
        }}
      >
        <div style={{ flex: "1 1 460px", minWidth: 280 }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 999,
              background: C.tagBg,
              color: C.tagInk,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.02em",
              marginBottom: 20,
            }}
          >
            FOR DANCERS OF EVERY LEVEL
          </div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(34px, 6vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 24px",
            }}
          >
            Book a class in one tap. Become a regular.
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 2.2vw, 19px)",
              color: C.inkSoft,
              maxWidth: 480,
              margin: "0 0 32px",
            }}
          >
            Find dance classes nearby or online, book your spot in one tap, and
            watch your own rhythm build week by week.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 36 }}>
            <Link
              href="/signup"
              style={{
                fontWeight: 700,
                fontSize: 16,
                padding: "16px 28px",
                borderRadius: 999,
                background: C.brand,
                color: C.onBrand,
                textDecoration: "none",
              }}
            >
              Get started, it&apos;s free
            </Link>
            {/* The comp's "See a demo class" has no feature behind it; browsing
                the real catalogue is the honest equivalent. */}
            <Link
              href="/discover"
              style={{
                fontWeight: 600,
                fontSize: 16,
                padding: "16px 28px",
                borderRadius: 999,
                border: "1.5px solid oklch(85% 0.01 70)",
                color: C.ink,
                textDecoration: "none",
              }}
            >
              Browse classes
            </Link>
          </div>

          {/* The comp's third stat was a 4.9-star rating. Nothing in the app
              collects ratings, so a real count of styles takes that slot. */}
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <Stat value="1-tap" label="booking, no forms" />
            {classCount > 0 && (
              <Stat value={<CountUp to={classCount} />} label="classes hosted" />
            )}
            {styleCount > 0 && (
              <Stat
                value={`${styleCount}`}
                label={styleCount === 1 ? "dance style" : "dance styles"}
              />
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 420px", minWidth: 280 }}>
          <HeroArt />
        </div>
      </section>

      {/* ── AUDIENCES ────────────────────────────────────────────────────── */}
      <section style={{ ...SHELL, padding: SECTION_PAD }}>
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(26px, 4vw, 36px)",
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
            }}
          >
            Built around the dance floor
          </h2>
          <p style={{ fontSize: 17, color: C.inkSoft, margin: 0 }}>
            Whether you&apos;re dancing, teaching, or running the studio, StepUp
            keeps everyone moving.
          </p>
        </div>

        <div
          style={{
            background: C.brand,
            borderRadius: 28,
            padding: "clamp(28px, 4vw, 44px)",
            color: C.onBrand,
            display: "flex",
            flexWrap: "wrap",
            gap: 36,
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div style={{ flex: "1 1 300px", minWidth: 240 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.02em",
                opacity: 0.85,
                marginBottom: 10,
              }}
            >
              FOR DANCERS
            </div>
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(22px, 3vw, 28px)",
                margin: "0 0 12px",
              }}
            >
              Discover, book, and find your people.
            </h3>
            <p style={{ fontSize: 16, opacity: 0.92, maxWidth: 460, margin: 0 }}>
              Browse classes at local studios or live online with independent
              instructors. One tap books your spot, no back-and-forth, no waiting
              on confirmation.
            </p>
          </div>
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 200,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <MiniStat
              value={styleCount > 0 ? `${styleCount}` : "—"}
              label={styleCount === 1 ? "class style" : "class styles"}
            />
            <MiniStat value="1 tap" label="to book" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <AudienceCard
            eyebrow="FOR STUDIOS"
            title="Fill your rosters, check in with a tap."
            body="List your classes, manage capacity, and check students in at the door, no clipboard required."
          />
          <AudienceCard
            eyebrow="FOR INDEPENDENT INSTRUCTORS"
            title="No studio? Teach live, build a following."
            body="Host online classes, set your own schedule, and grow a roster of regulars who follow you class after class."
          />
        </div>
      </section>

      {/* ── STUDIO SHOWCASE — real studios only ──────────────────────────── */}
      {studios.length > 0 && (
        <section style={{ background: C.bgAlt, padding: SECTION_PAD }}>
          <div style={SHELL}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 40,
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <h2
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: "clamp(24px, 3.6vw, 32px)",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Studios and instructors on StepUp
              </h2>
              <Link
                href="/discover"
                style={{ fontWeight: 700, fontSize: 15, color: C.brand, textDecoration: "none" }}
              >
                Browse all classes →
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 24,
              }}
            >
              {studios.map((studio, i) => {
                const [a, b] = STUDIO_SWATCHES[i % STUDIO_SWATCHES.length];
                return (
                  <div
                    key={studio.id}
                    style={{
                      background: C.card,
                      borderRadius: 20,
                      overflow: "hidden",
                      border: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    {/* Stand-in until there is real studio photography. */}
                    <div
                      aria-hidden
                      style={{
                        height: 150,
                        background: `repeating-linear-gradient(45deg, ${a}, ${a} 10px, ${b} 10px, ${b} 20px)`,
                      }}
                    />
                    <div style={{ padding: 18 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                        {studio.name}
                      </div>
                      <div style={{ fontSize: 13, color: C.inkSoft }}>
                        {studio.city}
                        {studio._count.classes > 0 &&
                          ` · ${studio._count.classes} upcoming`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS — hidden until real quotes exist ────────────────── */}
      {TESTIMONIALS.length > 0 && (
        <section style={{ ...SHELL, padding: SECTION_PAD }}>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(24px, 3.6vw, 32px)",
              letterSpacing: "-0.02em",
              margin: "0 0 40px",
              textAlign: "center",
            }}
          >
            Dancers keep coming back
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 24,
            }}
          >
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <p style={{ fontSize: 16, margin: "0 0 20px", color: "oklch(28% 0.02 60)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: t.avatarBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 14,
                      color: C.onBrand,
                    }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: C.inkSoft }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section style={{ background: C.bgAlt, padding: SECTION_PAD }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(24px, 3.6vw, 32px)",
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
            }}
          >
            Simple, honest pricing
          </h2>
          <p style={{ fontSize: 16, color: C.inkSoft, margin: "0 0 48px" }}>
            Free to dance. Studios and instructors keep more of what they earn.
          </p>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", textAlign: "left" }}>
            <div
              style={{
                flex: "1 1 320px",
                minWidth: 260,
                background: C.card,
                borderRadius: 24,
                padding: "clamp(28px, 4vw, 40px)",
                border: `2px solid ${C.brand}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: C.brand, marginBottom: 8 }}>
                DANCERS
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  marginBottom: 6,
                }}
              >
                Free
              </div>
              <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 24 }}>forever</div>
              <Feature>Unlimited class browsing &amp; booking</Feature>
              <Feature>See your progress, week by week</Feature>
              {/* The comp listed "Group bookings & friend invites"; neither
                  exists — a dancer books one seat at a time. */}
              <Feature last>Studios near you and classes live online</Feature>
              <Link
                href="/signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: 14,
                  borderRadius: 999,
                  background: C.brand,
                  color: C.onBrand,
                  textDecoration: "none",
                }}
              >
                Get started free
              </Link>
            </div>

            <div
              style={{
                flex: "1 1 320px",
                minWidth: 260,
                background: C.card,
                borderRadius: 24,
                padding: "clamp(28px, 4vw, 40px)",
                border: `1px solid ${C.borderSoft}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: C.inkSoft, marginBottom: 8 }}>
                STUDIOS &amp; INSTRUCTORS
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  marginBottom: 6,
                }}
              >
                {/* The comp said 5%. This is the rate the app actually charges. */}
                {PLATFORM_FEE_PERCENT}%
              </div>
              <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 24 }}>
                per booking, no monthly fee
              </div>
              <Feature>Roster &amp; scheduling tools</Feature>
              <Feature>One-tap check-in</Feature>
              <Feature last>Built-in discovery &amp; following</Feature>
              <Link
                href="/signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: 14,
                  borderRadius: 999,
                  border: `1.5px solid ${C.brand}`,
                  color: C.brand,
                  textDecoration: "none",
                }}
              >
                List your classes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: SECTION_PAD, textAlign: "center" }}>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: "clamp(26px, 4vw, 36px)",
            letterSpacing: "-0.02em",
            margin: "0 0 16px",
          }}
        >
          Your next class is one tap away.
        </h2>
        <Link
          href="/signup"
          style={{
            display: "inline-block",
            fontWeight: 700,
            fontSize: 16,
            padding: "16px 32px",
            borderRadius: 999,
            background: C.brand,
            color: C.onBrand,
            marginTop: 8,
            textDecoration: "none",
          }}
        >
          Get started, it&apos;s free
        </Link>
      </section>

      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: "32px clamp(20px, 5vw, 48px)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          color: "oklch(50% 0.02 60)",
          fontSize: 13,
        }}
      >
        <div style={{ fontFamily: DISPLAY, fontWeight: 800 }}>StepUp</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/legal/terms" style={{ color: "inherit", textDecoration: "none" }}>
            Terms
          </Link>
          <Link href="/legal/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy
          </Link>
          <span>© {new Date().getFullYear()} StepUp. Dance more. Dance together.</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.inkSoft }}>{label}</div>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        background: "oklch(99% 0.005 70 / 0.15)",
        borderRadius: 16,
        padding: "16px 20px",
        flex: "1 1 140px",
      }}
    >
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22 }}>{value}</div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{label}</div>
    </div>
  );
}

function AudienceCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 340px",
        minWidth: 260,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: "clamp(24px, 3.5vw, 36px)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.02em",
          color: C.inkSoft,
          marginBottom: 10,
        }}
      >
        {eyebrow}
      </div>
      <h3
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 22,
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 15, color: C.inkSoft, margin: 0 }}>{body}</p>
    </div>
  );
}

function Feature({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ fontSize: 15, marginBottom: last ? 24 : 8, display: "flex", gap: 8 }}>
      <CheckIcon />
      <span>{children}</span>
    </div>
  );
}

/** Line icon rather than a tick emoji — this page carries no emoji at all. */
function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ flex: "none", marginTop: 3 }}
    >
      <path
        d="M4.5 12.5l5 5 10-11"
        stroke={C.brand}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Stand-in for the hero photograph. The handoff asks for real studio
 * photography; until there is some, this is deliberately an illustration
 * rather than stock, so nothing here pretends to be a real class.
 */
function HeroArt() {
  return (
    <div
      aria-hidden
      style={{
        height: "clamp(280px, 45vw, 440px)",
        borderRadius: 28,
        background:
          "linear-gradient(140deg, oklch(92% 0.06 75), oklch(78% 0.13 45) 48%, oklch(58% 0.15 30))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          padding: 48,
          opacity: 0.35,
        }}
      >
        {[52, 96, 34, 120, 68, 140, 44, 104, 60, 84].map((h, i) => (
          <div
            key={i}
            className="stepup-host-eq"
            style={{
              flex: 1,
              maxWidth: 14,
              height: h,
              borderRadius: 7,
              background: "oklch(99% 0.005 70)",
              transformOrigin: "bottom",
              animation: `stepup-bar-bounce ${1.2 + (i % 5) * 0.2}s ease-in-out ${i * 0.08}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
