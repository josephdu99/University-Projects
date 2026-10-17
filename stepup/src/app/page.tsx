import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ROLE_HOME, SECTION_LABEL } from "@/lib/roles";
import { C, DISPLAY, marketingFontClass } from "@/lib/marketing-theme";
import { TESTIMONIALS } from "@/lib/marketing-content";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { CountUp } from "@/components/marketing/CountUp";

const STUDIO_SWATCHES = [
  ["oklch(90% 0.05 35)", "oklch(85% 0.05 35)"],
  ["oklch(90% 0.04 200)", "oklch(85% 0.04 200)"],
  ["oklch(90% 0.04 140)", "oklch(85% 0.04 140)"],
  ["oklch(90% 0.04 300)", "oklch(85% 0.04 300)"],
];

/**
 * The hero nav. The handoff pointed these at Discover, Leaderboard, Studios
 * and Instructors, but every one of those is behind a role gate, so a visitor
 * who is not signed in would be bounced to the login form by the marketing
 * nav. They point at this page's own sections instead, which works for
 * everybody and promises nothing that needs an account.
 */
const HERO_NAV = [
  { href: "#how", label: "HOW IT WORKS" },
  { href: "#progress", label: "PROGRESS" },
  { href: "#hosts", label: "FOR HOSTS" },
  { href: "#pricing", label: "PRICING" },
];

/**
 * The journey the dark panel shows off. These are the stages
 * `getDancerProfile` actually assigns, so the marketing page and the profile
 * cannot drift into describing two different ladders.
 */
const JOURNEY = ["Beginner", "Social dancer", "Regular"] as const;
const JOURNEY_CURRENT = 1;

/** Which of the last four weeks the example dancer made it to a class. */
const EXAMPLE_WEEKS = [true, false, true, true];

export const metadata = {
  title: "StepUp, Book a class in one tap",
  description:
    "Find dance classes nearby or online, and keep showing up, StepUp keeps score so you don't have to.",
};

export default async function Home() {
  const user = await getSessionUser();

  // Signed in or not, everybody gets the marketing page here, it is what the
  // wordmark points at from every shell. Only the calls to action change: no
  // point offering "Get started, it's free" to somebody who already has an
  // account. Signing in routes through `/go` instead.
  const home = user ? ROLE_HOME[user.role] : null;
  const homeLabel = user ? SECTION_LABEL[user.role] : null;

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
      className={marketingFontClass}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        background: C.bg,
        color: C.ink,
        lineHeight: 1.5,
      }}
    >
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 14px 0" }}>
        <header
          style={{
            position: "relative",
            background: C.heroBg,
            borderRadius: 32,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="stepup-hero-bar"
            style={{
              position: "relative",
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              padding: "22px clamp(16px, 2.5vw, 28px)",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "-0.02em",
                color: C.heroCream,
                background: C.ink,
                padding: "8px 16px",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              StepUp
            </Link>

            <nav
              className="stepup-hero-nav"
              style={{
                display: "flex",
                gap: "clamp(14px, 2.2vw, 28px)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.12em",
                color: C.heroCream,
                flexWrap: "wrap",
              }}
            >
              {HERO_NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {home ? (
                <Link
                  href={home}
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    padding: "12px 20px",
                    borderRadius: 999,
                    background: C.ink,
                    color: C.heroCream,
                    textDecoration: "none",
                  }}
                >
                  BACK TO {homeLabel!.toUpperCase()}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="stepup-hero-login"
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: "0.12em",
                      padding: "10px 14px",
                      color: C.heroCream,
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
                      padding: "12px 20px",
                      borderRadius: 999,
                      background: C.ink,
                      color: C.heroCream,
                      textDecoration: "none",
                    }}
                  >
                    GET STARTED
                  </Link>
                </>
              )}
            </div>
          </div>

          {/*
            The stage: the giant wordmark and the dancers standing on it.

            It is a sibling of the bar rather than positioned from the top of
            the panel, which is the whole trick. The handoff placed both at a
            fixed 92px, a number that only means "just under the nav" while the
            nav is exactly one row tall. On a narrow phone the buttons wrap and
            that assumption breaks, dropping them straight onto the artwork.
            Here the stage simply starts wherever the bar ends, so the bar can
            wrap to any height and nothing ever collides.
          */}
          <div
            style={{
              position: "relative",
              // The dancers overhang the bottom edge by design, so the stage
              // is their height less that overhang, measured from the word.
              minHeight:
                "calc(min(9vw, 144px) + min(598px, 80.5vw) - 52px)",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                // Only the bottom corners round: the top edge of the stage is
                // inside the panel, where there is no corner to follow.
                borderRadius: "0 0 32px 32px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  textAlign: "center",
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  // The handoff floored this at 130px, which is wider than a
                  // phone's panel: below about 430px the word was cut to
                  // "DAN", reading as a bug rather than a bleed. 25vw on its
                  // own fits at any width down to ~256px, so the floor is
                  // dropped to a value that only guards viewports narrower
                  // than any real phone. Nothing above 520px changes.
                  fontSize: "clamp(72px, 25vw, 400px)",
                  lineHeight: 0.82,
                  letterSpacing: "-0.05em",
                  color: C.heroCream,
                  userSelect: "none",
                }}
              >
                DANCE
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                zIndex: 2,
                left: "50%",
                top: "min(9vw, 144px)",
                transform: "translateX(-50%)",
                width: "min(520px, 70vw)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "4%",
                  right: "8%",
                  bottom: -6,
                  height: 18,
                  borderRadius: "50%",
                  background: "oklch(22% 0.02 60 / 0.14)",
                }}
              />
              <Image
                src="/hero-dancers.png"
                alt="Silhouette of a ballroom couple dancing"
                width={800}
                height={920}
                priority
                sizes="(max-width: 760px) 70vw, 520px"
                style={{
                  position: "relative",
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          </div>
        </header>
      </div>

      {/* ── TAGLINE, CALLS TO ACTION, FIGURES ──────────────────────────── */}
      <div style={{ height: "clamp(40px, 6vw, 72px)" }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          alignItems: "center",
          gap: 28,
          padding: "28px clamp(20px, 5vw, 48px) clamp(56px, 9vw, 96px)",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 12.5,
            lineHeight: 1.6,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            maxWidth: 340,
            textWrap: "pretty",
          }}
        >
          Book a class in one tap.
          <br />
          Find dance classes nearby or online and watch your rhythm build, week
          by week.
        </h1>

        <div
          className="stepup-band-cell"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={home ?? "/signup"}
            style={{
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.12em",
              padding: "14px 22px",
              borderRadius: 999,
              background: C.heroBg,
              color: C.onBrand,
              textDecoration: "none",
            }}
          >
            {home ? `BACK TO ${homeLabel!.toUpperCase()}` : "GET STARTED FREE"}
          </Link>
          {/* The handoff offered "SEE A DEMO CLASS". There is no demo class to
              send anybody to, so this is the real class list instead. */}
          <Link
            href="/discover"
            style={{
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.12em",
              padding: "14px 22px",
              borderRadius: 999,
              border: `1.5px solid ${C.ink}`,
              color: C.ink,
              textDecoration: "none",
            }}
          >
            BROWSE CLASSES
          </Link>
        </div>

        <div
          className="stepup-band-cell"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 22,
            flexWrap: "wrap",
          }}
        >
          <Stat value="1-tap" label="Booking" />
          {/* The handoff counted up to a hard-coded 2,400+. This counts up to
              however many classes there actually are. */}
          <Stat
            value={classCount > 0 ? <CountUp to={classCount} /> : "New"}
            label={classCount > 0 ? "Classes hosted" : "Platform"}
          />
          {/* Where the handoff put a 4.9-star dancer rating. Nothing in the
              app collects ratings, so this is the style count, which is real. */}
          <Stat
            value={styleCount > 0 ? `${styleCount}` : "All"}
            label={styleCount > 0 ? "Dance styles" : "Styles welcome"}
          />
        </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      {/*
        The handoff's three cards here were "Bring a friend" (a discount plus
        every third class free), "Book as a pod" (one booking covering 2 to 4
        people) and "See who's already going" (which of your friends booked).
        None of the three exists: there is no referral or discount of any kind,
        a booking is unique per dancer per class, and the app has no notion of
        who knows whom. Rather than advertise three features that would have to
        be built before a single visitor could use them, these are three things
        the app does today.
      */}
      <div
        id="how"
        style={{
          scrollMarginTop: 24,
          padding: "0 clamp(20px, 5vw, 48px) clamp(56px, 9vw, 96px)",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}
        >
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(26px, 4vw, 36px)",
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
              textWrap: "balance",
            }}
          >
            Getting into a class is the easy part.
          </h2>
          <p style={{ fontSize: 17, color: C.inkSoft, margin: 0 }}>
            Finding one, booking it and getting there should take less effort
            than the class itself.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          <HowCard
            title="One tap and you're on the roster"
            body="No forms, no waiting on somebody to confirm. Pick a class, book it, and it's in your schedule."
            icon={
              <>
                <path
                  d="M5 12.5 10 17.5 19 7"
                  stroke={C.tagInk}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            }
          />
          <HowCard
            title="Class full? Take the waitlist"
            body="You get a place in the queue, and an email the moment somebody drops out and the spot becomes yours."
            icon={
              <>
                <circle
                  cx="12"
                  cy="12"
                  r="8.2"
                  stroke={C.tagInk}
                  strokeWidth="1.6"
                />
                <path
                  d="M12 7.4V12l3.1 1.9"
                  stroke={C.tagInk}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            }
          />
          <HowCard
            title="In a studio, or live online"
            body="Browse classes at studios near you or join an independent instructor streaming live, booked exactly the same way."
            icon={
              <>
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="12"
                  rx="2"
                  stroke={C.tagInk}
                  strokeWidth="1.6"
                />
                <path
                  d="M8.5 20h7"
                  stroke={C.tagInk}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </>
            }
          />
        </div>
      </div>

      {/* ── PROGRESS ───────────────────────────────────────────────────── */}
      <div
        id="progress"
        style={{
          scrollMarginTop: 24,
          background: C.ink,
          color: C.onDark,
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
            <ConsistencyCard />
          </div>

          <div style={{ flex: "1 1 460px", minWidth: 280 }}>
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(28px, 4.5vw, 40px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: "0 0 20px",
              }}
            >
              Your dance journey, not just a checklist.
            </h2>
            <p
              style={{
                fontSize: 17,
                color: C.onDarkBody,
                maxWidth: 480,
                margin: "0 0 28px",
              }}
            >
              StepUp tracks where you are, not just how much you&apos;ve done,
              so what&apos;s next is always obvious.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                flexWrap: "wrap",
              }}
            >
              {JOURNEY.map((label, i) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    style={{
                      padding: "10px 18px",
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: 14,
                      fontFamily: DISPLAY,
                      background:
                        i === JOURNEY_CURRENT
                          ? C.brand
                          : "oklch(97% 0.01 70 / 0.08)",
                      color:
                        i === JOURNEY_CURRENT
                          ? C.onBrand
                          : i < JOURNEY_CURRENT
                            ? C.onDark
                            : "oklch(65% 0.015 70)",
                    }}
                  >
                    {label}
                  </div>
                  {i < JOURNEY.length - 1 && (
                    <div
                      aria-hidden
                      style={{ padding: "0 10px", color: "oklch(55% 0.02 60)" }}
                    >
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: 14.5,
                color: C.onDarkSoft,
                margin: "24px 0 0",
              }}
            >
              Stages come from classes you have actually attended, never a
              judgement call.
            </p>
          </div>
        </div>
      </div>

      {/* ── FOR HOSTS ──────────────────────────────────────────────────── */}
      <div
        id="hosts"
        style={{
          scrollMarginTop: 24,
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
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(26px, 4vw, 36px)",
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
            }}
          >
            Teaching, or running a studio?
          </h2>
          <p style={{ fontSize: 17, color: C.inkSoft, margin: 0 }}>
            StepUp works from the other side of the class too.
          </p>
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
      </div>

      {/* ── STUDIO SHOWCASE, real studios only ─────────────────────────── */}
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
                    {/* The handoff showed a studio photo here. Studios have no
                        photo to upload, so the stripe stands in for one. */}
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

      {/* ── TESTIMONIALS, hidden until real quotes exist ───────────────── */}
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
                <p
                  style={{
                    fontSize: 16,
                    margin: "0 0 20px",
                    color: C.inkBody,
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

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <div
        id="pricing"
        style={{
          scrollMarginTop: 24,
          background: C.bgAlt,
          padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
        }}
      >
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
                  fontFamily: DISPLAY,
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
              <Feature>Weekly progress &amp; class rankings</Feature>
              {/* The handoff said "Group bookings & friend invites". Neither
                  exists, so this is the streak, which does. */}
              <Feature last>Streaks that reward showing up</Feature>
              <Link
                href={home ?? "/signup"}
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
                {home ? `Back to ${homeLabel}` : "Get started free"}
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
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 36,
                  marginBottom: 6,
                }}
              >
                {/* The handoff said 5%; this is the rate the app actually
                    charges, so it tracks PLATFORM_FEE_PERCENT instead. */}
                {PLATFORM_FEE_PERCENT}%
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
                href={home ?? "/signup"}
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
                {home ? `Back to ${homeLabel}` : "List your classes"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLOSING CALL TO ACTION ─────────────────────────────────────── */}
      <div
        style={{
          padding: "clamp(56px, 9vw, 96px) clamp(20px, 5vw, 48px)",
          textAlign: "center",
        }}
      >
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
        {upcomingCount > 0 && (
          <p style={{ fontSize: 16, color: C.inkSoft, margin: "0 0 8px" }}>
            {upcomingCount} class{upcomingCount === 1 ? "" : "es"} coming up
            right now.
          </p>
        )}
        <Link
          href={home ?? "/signup"}
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
          {home ? `Back to ${homeLabel}` : "Get started, it's free"}
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
        <div style={{ fontFamily: DISPLAY, fontWeight: 800 }}>StepUp</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link
            href="/legal/terms"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Terms
          </Link>
          <Link
            href="/legal/privacy"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Privacy
          </Link>
          <span>
            © {new Date().getFullYear()} StepUp. Dance more, dance together.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22 }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.inkSoft,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function HowCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: "clamp(24px, 3.5vw, 32px)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: C.tagBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          {icon}
        </svg>
      </div>
      <h3
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 19,
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 15, color: C.inkSoft, margin: 0 }}>{body}</p>
    </div>
  );
}

/**
 * The dark panel's "show, don't tell" widget: four weeks of a sample dancer's
 * consistency, drawn as the real UI rather than described in bullet points.
 *
 * The figures are illustrative, not anybody's actual month, which is why the
 * card announces itself as an example to screen readers. The handoff paired it
 * with a nudge, "it's been 3 weeks since your last salsa class", implying the
 * app reaches out when you lapse. It doesn't, so the nudge is not here.
 */
function ConsistencyCard() {
  const attended = EXAMPLE_WEEKS.filter(Boolean).length;
  return (
    <div
      role="img"
      aria-label={`Example of a dancer's month on StepUp: classes in ${attended} of the last ${EXAMPLE_WEEKS.length} weeks.`}
      style={{
        background: "oklch(18% 0.015 60)",
        border: `1px solid oklch(97% 0.01 70 / 0.08)`,
        borderRadius: 28,
        padding: "clamp(22px, 3.5vw, 32px)",
        maxWidth: 420,
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 6,
        }}
      >
        Bachata, last 4 weeks
      </div>
      <div
        style={{ fontSize: 13.5, color: C.onDarkSoft, marginBottom: 20 }}
      >
        You&apos;re building consistency, {attended} of your last{" "}
        {EXAMPLE_WEEKS.length} scheduled weeks.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {EXAMPLE_WEEKS.map((filled, i) => (
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
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 6,
                background: filled ? C.brand : "transparent",
              }}
            />
          </div>
        ))}
      </div>
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
