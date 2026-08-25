import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { getHostDashboard } from "@/lib/host-data";
import {
  startPayoutOnboardingAction,
  openPayoutDashboardAction,
} from "@/lib/actions/payout-actions";
import { HostEqualizer } from "./HostEqualizer";
import { ClassRowList } from "./ClassRow";
import { AvatarStack, describeFaces } from "./AvatarStack";

/** How many past classes the dashboard shows before deferring to /classes. */
const PAST_ON_DASHBOARD = 6;
/** Progress row in the "classes hosted" card caps out here. */
const SEGMENTS = 8;

const BASE = "/studio";
const NEW_CLASS = `${BASE}/classes/new`;

export async function HostDashboard({
  hostId,
  title,
  addressLine,
  timezone,
  payoutsConnected,
}: {
  hostId: string;
  /** The studio's name. */
  title: string;
  /** Street address, shown before the timezone in the hero meta row. */
  addressLine: string;
  timezone: string;
  payoutsConnected: boolean;
}) {
  const d = await getHostDashboard(hostId);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: C.ink,
          color: C.onDark,
          borderRadius: 28,
          padding: "clamp(28px, 4vw, 40px) clamp(24px, 4vw, 44px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
          overflow: "hidden",
          position: "relative",
          marginBottom: 20,
        }}
      >
        <HostEqualizer variant="hero" />

        <div style={{ position: "relative" }}>
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
              marginBottom: 16,
            }}
          >
            YOUR STUDIO
          </div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(30px, 5vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            {title}
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 16,
              fontSize: 15,
              color: "oklch(78% 0.015 70)",
            }}
          >
            <span>{addressLine}</span>
            <span
              aria-hidden
              style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                background: "oklch(55% 0.02 60)",
              }}
            />
            <span>Class times in {timezone.replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Sits above the equaliser: the outline pill is transparent, so
            without this the bars run straight through its label. */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={NEW_CLASS}
            style={{
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 24px",
              borderRadius: 999,
              background: C.brand,
              color: C.onBrand,
              textDecoration: "none",
            }}
          >
            Create a class
          </Link>
          <Link
            href="/profile"
            style={{
              fontWeight: 600,
              fontSize: 15,
              padding: "14px 24px",
              borderRadius: 999,
              border: `1.5px solid ${C.darkBorder}`,
              background: C.ink,
              color: "oklch(92% 0.01 70)",
              textDecoration: "none",
            }}
          >
            Edit studio
          </Link>
          {/* The amber nudge below is the only other route to Stripe, and it
              disappears on connect — so once connected the link lives here
              instead of vanishing with it. */}
          {payoutsConnected && (
            <form action={openPayoutDashboardAction}>
              <button
                type="submit"
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "14px 24px",
                  borderRadius: 999,
                  border: `1.5px solid ${C.darkBorder}`,
                  background: C.ink,
                  color: "oklch(92% 0.01 70)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Payouts
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Upcoming"
          value={d.upcoming.length}
          qualifier={
            d.upcoming.length === 1
              ? "class on the calendar"
              : "classes on the calendar"
          }
        >
          {d.upcoming.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.warn, fontWeight: 600 }}>
              Nothing scheduled yet
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: C.label, fontWeight: 600 }}>
              Next one {nextClassPhrase(d.upcoming[0].startTime)}
            </div>
          )}
        </StatCard>

        <StatCard label="Classes hosted" value={d.hostedCount} qualifier="all time">
          <div aria-hidden style={{ display: "flex", gap: 5, marginTop: 2 }}>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <div
                key={i}
                className="stepup-grow"
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  background: i < d.hostedCount ? C.brand : C.barTrack,
                  transformOrigin: "left",
                  animation: `stepup-seg-grow 0.5s ease-out ${i * 0.06}s both`,
                }}
              />
            ))}
          </div>
        </StatCard>

        <StatCard
          label="Check-ins"
          value={d.checkInCount}
          qualifier={d.checkInCount === 1 ? "dancer showed up" : "dancers showed up"}
        >
          {d.checkInFaces.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <AvatarStack faces={d.checkInFaces} />
              <span style={{ fontSize: 13.5, color: C.label, marginLeft: 10 }}>
                {describeFaces(d.checkInFaces, d.checkInCount)}, so far
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: C.label }}>
              Nobody has checked in yet
            </div>
          )}
        </StatCard>
      </section>

      {/* ── PAYOUTS NUDGE — disappears entirely once connected ───────────── */}
      {!payoutsConnected && (
        <section
          style={{
            background: C.nudgeBg,
            border: `1px solid ${C.nudgeBorder}`,
            borderRadius: 24,
            padding: "28px clamp(20px, 3vw, 32px)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 36,
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flex: "1 1 420px" }}>
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: C.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2.5" y="6" width="19" height="13" rx="3" stroke={C.nudgeIcon} strokeWidth="1.6" />
                <path d="M2.5 10.5h19" stroke={C.nudgeIcon} strokeWidth="1.6" />
                <path d="M6.5 15h4" stroke={C.nudgeIcon} strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, margin: 0 }}>
                  Get paid for your classes
                </h2>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: C.card,
                    color: C.nudgeIcon,
                  }}
                >
                  NOT SET UP
                </span>
              </div>
              <p style={{ fontSize: 15, color: C.nudgeInk, margin: 0, maxWidth: 520 }}>
                Connect a payout account to charge for classes and receive money
                directly. Free classes work without it, so there&apos;s no rush.
              </p>
            </div>
          </div>
          {/* Onboarding is a Stripe redirect, so this posts a server action
              rather than linking anywhere. */}
          <form action={startPayoutOnboardingAction} style={{ flex: "none" }}>
            <button
              type="submit"
              style={{
                fontWeight: 700,
                fontSize: 15,
                padding: "14px 26px",
                borderRadius: 999,
                border: "none",
                background: C.brand,
                color: C.onBrand,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Set up payouts
            </button>
          </form>
        </section>
      )}

      {/* ── UPCOMING ─────────────────────────────────────────────────────── */}
      <SectionHeader title="Upcoming classes">
        <Link href={`${BASE}/classes`} style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>
          View full calendar
        </Link>
      </SectionHeader>

      {d.upcoming.length === 0 ? (
        <div
          style={{
            background: C.card,
            border: `1.5px dashed ${C.dashed}`,
            borderRadius: 24,
            padding: "clamp(36px, 5vw, 52px) clamp(24px, 4vw, 40px)",
            textAlign: "center",
            marginBottom: 44,
          }}
        >
          <HostEqualizer variant="empty" />
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 21, margin: "0 0 8px" }}>
            The floor is empty this week
          </h3>
          <p
            style={{
              fontSize: 15.5,
              color: "oklch(50% 0.02 60)",
              margin: "0 auto 24px",
              maxWidth: 420,
            }}
          >
            {d.lastPastFill
              ? `Your last class filled ${d.lastPastFill.booked} of ${d.lastPastFill.capacity} spots. Post another and it shows up in Discover straight away.`
              : "Post your first class and it goes live to dancers browsing StepUp straight away."}
          </p>
          <Link
            href={NEW_CLASS}
            style={{
              display: "inline-block",
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 999,
              background: C.brand,
              color: C.onBrand,
              textDecoration: "none",
            }}
          >
            Create a class
          </Link>
        </div>
      ) : (
        <div style={{ marginBottom: 44 }}>
          <ClassRowList classes={d.upcoming} base={BASE} action="manage" />
        </div>
      )}

      {/* ── PAST ─────────────────────────────────────────────────────────── */}
      {d.past.length > 0 && (
        <>
          <SectionHeader title="Past classes">
            <span style={{ fontSize: 14, color: C.label }}>{d.hostedCount} hosted</span>
          </SectionHeader>
          <ClassRowList
            classes={d.past.slice(0, PAST_ON_DASHBOARD)}
            base={BASE}
            action="runAgain"
          />
          {d.past.length > PAST_ON_DASHBOARD && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <Link href={`${BASE}/classes`} style={{ fontSize: 14, fontWeight: 600, color: C.brand }}>
                Show all {d.past.length} past classes
              </Link>
            </div>
          )}
        </>
      )}

      {/* ── CLOSING INSIGHT ───────────────────────────────────────────────
          Single column on purpose. The comp's right-hand panel charted
          "posted publicly only" against "shared to your dancer list"; that
          comparison is a counterfactual nothing in the data can answer, and
          there is no share feature behind it, so the panel is gone rather
          than filled with invented figures. */}
      {d.dancers.size > 0 && (
        <section
          style={{
            marginTop: 52,
            border: `1px solid ${C.border}`,
            borderRadius: 28,
            background: C.card,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "36px clamp(24px, 4vw, 40px)",
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: C.tagBg,
                  color: "oklch(42% 0.1 70)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  marginBottom: 18,
                }}
              >
                <span
                  aria-hidden
                  style={{ width: 6, height: 6, borderRadius: 999, background: C.brand }}
                />
                ONE THING TO TRY
              </div>
              <h3
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: "clamp(22px, 3vw, 27px)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  margin: "0 0 12px",
                }}
              >
                Your dancer list is your fullest room.
              </h3>
              <p style={{ fontSize: 15.5, color: C.inkSoft, margin: 0, maxWidth: 460 }}>
                {d.dancers.size} {d.dancers.size === 1 ? "person has" : "people have"} taken
                a class with you.{" "}
                {d.averageFillPct !== null
                  ? `Across everything you have hosted, ${d.averageFillPct}% of the seats you offered were filled — `
                  : ""}
                {d.averageFillPct !== null
                  ? "these are the people most likely to fill the rest."
                  : "They already know the room, and they are the easiest seats to fill again."}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <AvatarStack faces={d.dancers.faces} size={30} />
                <span style={{ fontSize: 13.5, color: C.label }}>
                  {describeFaces(d.dancers.faces, d.dancers.size)} from past classes
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
              <Link
                href={`${BASE}/dancers`}
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 26px",
                  borderRadius: 999,
                  background: C.ink,
                  color: C.onDark,
                  textDecoration: "none",
                }}
              >
                See who&apos;s on it
              </Link>
              <Link href={NEW_CLASS} style={{ fontSize: 14.5, fontWeight: 600, color: C.inkSoft }}>
                Create a class
              </Link>
            </div>
          </div>

        </section>
      )}
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  qualifier,
  children,
}: {
  label: string;
  value: number;
  qualifier: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: "26px 28px",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: C.label,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 14, color: C.label }}>{qualifier}</div>
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(22px, 3vw, 26px)",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function nextClassPhrase(start: Date): string {
  const days = Math.round((start.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}
