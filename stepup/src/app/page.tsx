import Link from "next/link";
import { redirect } from "next/navigation";
import { Sora, Work_Sans } from "next/font/google";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME } from "@/lib/roles";

// Scoped to this page so the in-app UI keeps its own typography.
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const C = {
  bg: "oklch(97.5% 0.012 70)",
  bgAlt: "oklch(94% 0.015 70)",
  card: "oklch(99% 0.005 70)",
  ink: "oklch(22% 0.02 60)",
  inkSoft: "oklch(45% 0.02 60)",
  border: "oklch(90% 0.01 70)",
  borderSoft: "oklch(88% 0.01 70)",
  brand: "oklch(66% 0.19 35)",
  onBrand: "oklch(99% 0.005 70)",
  gold: "oklch(78% 0.15 85)",
};

const GAMIFICATION_FEATURES = [
  {
    title: "Points for every class",
    desc: "Book and attend to earn points — bonus points for trying new styles or studios.",
  },
  {
    title: "Badges for milestones",
    desc: "Unlock badges for streaks, style variety, and class counts as you go.",
  },
  {
    title: "Leaderboards with friends",
    desc: "See how your crew stacks up weekly, and challenge each other to keep moving.",
  },
];

/**
 * Real testimonials only. The design mockup shipped with example quotes
 * attributed to invented people; publishing those would be presenting
 * fabricated reviews as genuine, so the section stays hidden until there are
 * real ones to show. Add entries here once you have permission to quote them.
 */
const TESTIMONIALS: {
  quote: string;
  name: string;
  role: string;
  initial: string;
  avatarBg: string;
}[] = [];

const STUDIO_SWATCHES = [
  ["oklch(90% 0.05 35)", "oklch(85% 0.05 35)"],
  ["oklch(90% 0.04 200)", "oklch(85% 0.04 200)"],
  ["oklch(90% 0.04 140)", "oklch(85% 0.04 140)"],
  ["oklch(90% 0.04 300)", "oklch(85% 0.04 300)"],
];

export const metadata = {
  title: "StepUp — Book a class in one tap",
  description:
    "Find dance classes nearby or online, earn points and badges for every session, and keep your streak alive.",
};

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  // Headline figures come from the database rather than being hard-coded, so
  // the page never overstates how much is actually on the platform.
  const [classCount, styleRows, studios, upcomingCount] = await Promise.all([
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
    db.danceClass.count({
      where: { startTime: { gte: new Date() }, cancelledAt: null },
    }),
  ]);

  const styleCount = styleRows.length;

  return (
    <div
      className={`${sora.variable} ${workSans.variable}`}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
      }}
    >
      {/* NAV */}
      <div
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
            fontFamily: "var(--font-display), sans-serif",
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
      </div>

      {/* HERO */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 56,
          padding: "clamp(48px, 8vw, 88px) clamp(20px, 5vw, 48px) clamp(56px, 9vw, 96px)",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div style={{ flex: "1 1 460px", minWidth: 280 }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 999,
              background: "oklch(94% 0.05 85)",
              color: "oklch(38% 0.09 70)",
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
              fontFamily: "var(--font-display), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(34px, 6vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 24px",
            }}
          >
            Book a class in one tap. Level up every time you show up.
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 2.2vw, 19px)",
              color: C.inkSoft,
              maxWidth: 480,
              margin: "0 0 32px",
            }}
          >
            Find dance classes nearby or online, earn points and badges for
            every session, and keep your streak alive with friends cheering you
            on.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              marginBottom: 36,
            }}
          >
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
              Get started — it&apos;s free
            </Link>
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
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <Stat value="1-tap" label="booking, no forms" />
            <Stat
              value={classCount > 0 ? `${classCount}` : "New"}
              label={classCount > 0 ? "classes hosted" : "platform, growing fast"}
            />
            <Stat
              value={styleCount > 0 ? `${styleCount}` : "All"}
              label={styleCount > 0 ? "dance styles" : "styles welcome"}
            />
          </div>
        </div>

        <div style={{ flex: "1 1 420px", minWidth: 280 }}>
          <HeroArt />
        </div>
      </div>

      {/* GAMIFICATION */}
      <div
        style={{
          background: C.ink,
          color: "oklch(97% 0.01 70)",
          padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap-reverse",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 280 }}>
            <ProgressArt />
          </div>
          <div style={{ flex: "1 1 460px", minWidth: 280 }}>
            <div
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 999,
                background: "oklch(78% 0.15 85 / 0.2)",
                color: C.gold,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.02em",
                marginBottom: 20,
              }}
            >
              GAMIFIED PROGRESS
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 4.5vw, 40px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: "0 0 20px",
              }}
            >
              Every class you take moves the needle.
            </h2>
            <p
              style={{
                fontSize: 17,
                color: "oklch(80% 0.015 70)",
                maxWidth: 480,
                margin: "0 0 32px",
              }}
            >
              Earn points for showing up, unlock badges for milestones, and see
              how you stack up against your crew — all without lifting a finger
              beyond booking your next class.
            </p>
            {GAMIFICATION_FEATURES.map((feat) => (
              <div
                key={feat.title}
                style={{ display: "flex", gap: 16, marginBottom: 22 }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: C.gold,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}
                  >
                    {feat.title}
                  </div>
                  <div style={{ fontSize: 14, color: "oklch(75% 0.015 70)" }}>
                    {feat.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AUDIENCES */}
      <div
        style={{
          padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(26px, 4vw, 36px)",
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
            }}
          >
            Built around the dance floor
          </h2>
          <p style={{ fontSize: 17, color: C.inkSoft, margin: 0 }}>
            Whether you&apos;re dancing, teaching, or running the studio —
            StepUp keeps everyone moving.
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
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 800,
                fontSize: "clamp(22px, 3vw, 28px)",
                margin: "0 0 12px",
              }}
            >
              Discover, book, and never lose your streak.
            </h3>
            <p
              style={{
                fontSize: 16,
                opacity: 0.92,
                maxWidth: 460,
                margin: 0,
              }}
            >
              Browse classes at local studios or live online with independent
              instructors. One tap books your spot — no back-and-forth, no
              waiting on confirmation.
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
              label="class styles"
            />
            <MiniStat value="1 tap" label="to book" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <AudienceCard
            eyebrow="FOR STUDIOS"
            title="Fill your rosters, check in with a tap."
            body="List your classes, manage capacity, and check students in at the door — no clipboard required."
          />
          <AudienceCard
            eyebrow="FOR INDEPENDENT INSTRUCTORS"
            title="No studio? Teach live, build a following."
            body="Host online classes, set your own schedule, and grow a roster of regulars who follow you class after class."
          />
        </div>
      </div>

      {/* STUDIO SHOWCASE — real studios only */}
      {studios.length > 0 && (
        <div
          style={{
            background: C.bgAlt,
            padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
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
                  fontFamily: "var(--font-display), sans-serif",
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
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: C.brand,
                  textDecoration: "none",
                }}
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
                    <div
                      style={{
                        height: 150,
                        background: `repeating-linear-gradient(45deg, ${a}, ${a} 10px, ${b} 10px, ${b} 20px)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 40,
                      }}
                    >
                      {studio.emoji}
                    </div>
                    <div style={{ padding: 18 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          marginBottom: 4,
                        }}
                      >
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
        </div>
      )}

      {/* TESTIMONIALS — hidden until real quotes exist */}
      {TESTIMONIALS.length > 0 && (
        <div
          style={{
            padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
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
                <p
                  style={{
                    fontSize: 16,
                    margin: "0 0 20px",
                    color: "oklch(28% 0.02 60)",
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
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
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 13, color: C.inkSoft }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRICING */}
      <div
        style={{
          background: C.bgAlt,
          padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
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

          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              textAlign: "left",
            }}
          >
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
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: C.brand,
                  marginBottom: 8,
                }}
              >
                DANCERS
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 800,
                  fontSize: 36,
                  marginBottom: 6,
                }}
              >
                Free
              </div>
              <div
                style={{ fontSize: 14, color: C.inkSoft, marginBottom: 24 }}
              >
                forever
              </div>
              <Feature>Unlimited class browsing &amp; booking</Feature>
              <Feature>Points, badges &amp; leaderboards</Feature>
              <Feature last>Streaks &amp; friend challenges</Feature>
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
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: C.inkSoft,
                  marginBottom: 8,
                }}
              >
                STUDIOS &amp; INSTRUCTORS
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 800,
                  fontSize: 36,
                  marginBottom: 6,
                }}
              >
                10%
              </div>
              <div
                style={{ fontSize: 14, color: C.inkSoft, marginBottom: 24 }}
              >
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
      </div>

      {/* FOOTER CTA */}
      <div
        style={{
          padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontWeight: 800,
            fontSize: "clamp(26px, 4vw, 36px)",
            letterSpacing: "-0.02em",
            margin: "0 0 16px",
          }}
        >
          Your next class is one tap away.
        </h2>
        {upcomingCount > 0 && (
          <p style={{ fontSize: 16, color: C.inkSoft, margin: "0 0 8px" }}>
            {upcomingCount} class{upcomingCount === 1 ? "" : "es"} coming up
            right now.
          </p>
        )}
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
          Get started — it&apos;s free
        </Link>
      </div>

      <div
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
        <div
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontWeight: 800,
          }}
        >
          StepUp
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/legal/terms" style={{ color: "inherit", textDecoration: "none" }}>
            Terms
          </Link>
          <Link href="/legal/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy
          </Link>
          <span>© {new Date().getFullYear()} StepUp. Dance more, level up.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontWeight: 800,
          fontSize: 24,
        }}
      >
        {value}
      </div>
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
      <div
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontWeight: 800,
          fontSize: 22,
        }}
      >
        {value}
      </div>
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
          fontFamily: "var(--font-display), sans-serif",
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

function Feature({
  children,
  last,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ fontSize: 15, marginBottom: last ? 24 : 8 }}>
      ✓ {children}
    </div>
  );
}

/**
 * Stand-in artwork for the design's photo slots. Rendered rather than left as
 * an empty box so the page looks finished until real photography is supplied.
 */
function HeroArt() {
  return (
    <div
      style={{
        height: "clamp(280px, 45vw, 440px)",
        borderRadius: 28,
        background:
          "linear-gradient(140deg, oklch(88% 0.09 45), oklch(72% 0.16 35) 45%, oklch(52% 0.13 25))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: "clamp(70px, 13vw, 140px)", lineHeight: 1 }}>
        💃
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: 22,
          right: 22,
          background: "oklch(99% 0.005 70 / 0.92)",
          borderRadius: 16,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 26 }}>🔥</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>
            6-week streak
          </div>
          <div style={{ fontSize: 13, color: C.inkSoft }}>
            Keep it alive — book your next class
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressArt() {
  const levels = [
    { name: "Newcomer", pct: 100 },
    { name: "Groove Getter", pct: 72 },
    { name: "Rhythm Rider", pct: 34 },
  ];

  return (
    <div
      style={{
        height: "clamp(280px, 45vw, 440px)",
        borderRadius: 28,
        background: "oklch(28% 0.025 60)",
        border: "1px solid oklch(38% 0.02 60)",
        padding: "clamp(22px, 3.5vw, 34px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 22,
      }}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["🎉", "⭐", "🔥", "🌈", "🦋"].map((e) => (
          <div
            key={e}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "oklch(78% 0.15 85 / 0.18)",
              border: "1px solid oklch(78% 0.15 85 / 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {e}
          </div>
        ))}
      </div>

      {levels.map((l) => (
        <div key={l.name}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "oklch(80% 0.015 70)",
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 600 }}>{l.name}</span>
            <span>{l.pct}%</span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "oklch(38% 0.02 60)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${l.pct}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
