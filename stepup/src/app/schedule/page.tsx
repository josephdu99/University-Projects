import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { publicName } from "@/lib/roles";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { styleChipStyle } from "@/lib/style-chips";
import { AttendButton } from "@/components/classes/AttendButton";
import {
  attendedNotes,
  attendedSummary,
  countdownLabel,
  phaseOf,
} from "@/lib/my-classes";
import {
  dateBlockParts,
  formatClassWhen,
  formatClassDayTime,
  formatDuration,
} from "@/lib/time";

export const metadata = { title: "My classes · StepUp" };

const LIVE = ["BOOKED", "PENDING_PAYMENT", "WAITLISTED"];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { paid } = await searchParams;
  const tz = user.timezone;
  const now = new Date();

  const bookings = await db.booking.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: {
      class: {
        include: {
          studio: { select: { name: true, address: true, city: true } },
          host: { select: { name: true, displayName: true } },
        },
      },
    },
    orderBy: { class: { startTime: "asc" } },
  });

  const upcoming = bookings.filter(
    (b) => LIVE.includes(b.status) && b.class.startTime >= now
  );
  const awaitingCheckIn = bookings.filter(
    (b) => b.status === "BOOKED" && b.class.startTime < now
  );
  const attended = bookings.filter((b) => b.status === "ATTENDED");

  const [next, ...later] = upcoming;
  const notes = attendedNotes(
    attended.map((b) => ({ id: b.id, style: b.class.style, format: b.class.format }))
  );

  return (
    <div>
      {paid === "1" && (
        <p
          style={{
            margin: "0 0 20px",
            padding: "14px 20px",
            borderRadius: 16,
            background: "oklch(95% 0.05 145)",
            color: "oklch(42% 0.13 145)",
            fontSize: 14.5,
            fontWeight: 600,
          }}
        >
          Payment received, you&apos;re booked in.
        </p>
      )}

      {next ? (
        <NextClassHero booking={next} timeZone={tz} now={now} />
      ) : (
        <EmptyHero />
      )}

      {awaitingCheckIn.length > 0 && (
        <>
          <SectionHead title="Waiting on check-in" />
          <div style={listStyle}>
            {awaitingCheckIn.map((b, i) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 18,
                  padding: "18px 26px",
                  borderTop: i ? `1px solid ${C.rowDivider}` : undefined,
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16.5 }}>
                    {b.class.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.label }}>
                    {formatClassWhen(b.class.startTime, tz)}
                  </div>
                </div>
                {b.class.format === "ONLINE" ? (
                  <AttendButton bookingId={b.id} />
                ) : (
                  <span style={{ fontSize: 13.5, color: C.label }}>
                    The studio checks you in
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead
        title="After that"
        action={{ href: "/discover", label: "Find a class" }}
      />
      <section style={listStyle} aria-label="Later bookings">
        {later.map((b, i) => {
          const when = dateBlockParts(b.class.startTime, tz);
          return (
            <div
              key={b.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 18,
                padding: "18px 26px",
                borderTop: i ? `1px solid ${C.rowDivider}` : undefined,
              }}
            >
              <div style={{ flex: "none", width: 58 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "oklch(58% 0.02 60)",
                  }}
                >
                  {when.month}
                </div>
                <div
                  style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}
                >
                  {when.day}
                </div>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 2,
                  }}
                >
                  <b style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16.5 }}>
                    {b.class.title}
                  </b>
                  <span style={{ ...styleChipStyle(b.class.style), fontSize: 11.5 }}>
                    {b.class.style}
                  </span>
                  {b.status === "WAITLISTED" && (
                    <span style={noteChip}>Waitlist #{b.waitlistPosition ?? "—"}</span>
                  )}
                  {b.status === "PENDING_PAYMENT" && (
                    <span style={noteChip}>Payment pending</span>
                  )}
                </div>
                <div style={{ fontSize: 13.5, color: C.label }}>
                  {when.time} ·{" "}
                  {b.class.format === "ONLINE"
                    ? `live online with ${publicName(b.class.host)}`
                    : `${b.class.studio?.name ?? publicName(b.class.host)}${b.class.studio?.city ? `, ${b.class.studio.city}` : ""}`}
                </div>
              </div>
              <Link
                href={`/classes/${b.classId}`}
                style={{
                  flex: "none",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "oklch(45% 0.02 60)",
                  textDecoration: "none",
                }}
              >
                Manage
              </Link>
            </div>
          );
        })}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 26px",
            borderTop: later.length ? `1px solid ${C.rowDivider}` : undefined,
            background: "oklch(98.4% 0.008 70)",
          }}
        >
          <span style={{ fontSize: 14, color: "oklch(50% 0.02 60)" }}>
            {later.length
              ? "That's everything you have booked."
              : next
                ? "Nothing booked past then."
                : "Nothing booked yet."}
          </span>
          <Link
            href="/discover"
            style={{
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 20px",
              borderRadius: 999,
              background: "transparent",
              border: `1.5px solid ${C.brand}`,
              color: C.brand,
              textDecoration: "none",
            }}
          >
            Browse classes
          </Link>
        </div>
      </section>

      <SectionHead
        title="Classes attended"
        note={attendedSummary(
          attended.map((b) => ({
            style: b.class.style,
            studio: b.class.studio?.name ?? null,
          })),
          attended[0]?.class.startTime ?? null,
          tz
        )}
      />
      <section style={listStyle} aria-label="Classes you have danced">
        {attended.length === 0 ? (
          <p style={{ margin: 0, padding: "26px", fontSize: 14.5, color: C.label }}>
            Once you have danced a class it shows up here.
          </p>
        ) : (
          // Newest first: the most recent thing you did is the most useful
          // to see, even though the notes were derived oldest-first.
          [...attended].reverse().map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                padding: "15px 26px",
                borderTop: i ? "1px solid oklch(93.5% 0.008 70)" : undefined,
              }}
            >
              <div
                style={{
                  flex: "none",
                  width: 58,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "oklch(56% 0.02 60)",
                }}
              >
                {shortDate(b.class.startTime, tz)}
              </div>
              <div
                style={{
                  flex: "1 1 200px",
                  minWidth: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <b style={{ fontSize: 15.5, fontWeight: 600 }}>{b.class.title}</b>
                <span style={{ ...styleChipStyle(b.class.style), fontSize: 11 }}>
                  {b.class.style}
                </span>
                {notes.get(b.id) && <span style={noteChip}>{notes.get(b.id)}</span>}
              </div>
              <div
                style={{
                  flex: "none",
                  fontSize: 13.5,
                  color: "oklch(55% 0.02 60)",
                  whiteSpace: "nowrap",
                }}
              >
                {b.class.studio?.name ?? "Live online"}
              </div>
              <Link
                href={`/discover?q=${encodeURIComponent(b.class.title)}`}
                style={{
                  flex: "none",
                  whiteSpace: "nowrap",
                  fontSize: 13.5,
                  fontWeight: 700,
                  padding: "9px 18px",
                  borderRadius: 999,
                  background: "transparent",
                  border: `1.5px solid ${C.brand}`,
                  color: C.brand,
                  textDecoration: "none",
                }}
              >
                Attend again
              </Link>
            </div>
          ))
        )}
      </section>

      <p style={{ fontSize: 13.5, color: C.label, margin: "14px 0 0", padding: "0 6px" }}>
        Studios see your name on the roster for classes you book with them, so
        they can check you in. Nothing else.
      </p>
    </div>
  );
}

const listStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 22,
  overflow: "hidden",
};

const noteChip: React.CSSProperties = {
  whiteSpace: "nowrap",
  padding: "3px 10px",
  borderRadius: 999,
  background: C.nudgeBg,
  color: C.nudgeInk,
  fontSize: 12,
  fontWeight: 600,
};

function shortDate(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(instant);
}

function SectionHead({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        margin: "38px 0 14px",
        padding: "0 6px",
      }}
    >
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", margin: 0 }}>
        {title}
      </h2>
      {note && <span style={{ fontSize: 13.5, color: C.label }}>{note}</span>}
      {action && (
        <Link
          href={action.href}
          style={{
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            color: C.brand,
            textDecoration: "none",
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Just the parts of a booking the hero renders. */
type HeroBooking = {
  classId: string;
  status: string;
  waitlistPosition: number | null;
  class: {
    title: string;
    style: string;
    format: string;
    startTime: Date;
    durationMin: number;
    onlineLink: string | null;
    checkInCode: string | null;
    studio: { name: string; address: string; city: string } | null;
    host: { name: string; displayName: string | null };
  };
};

function NextClassHero({
  booking,
  timeZone,
  now,
}: {
  booking: HeroBooking;
  timeZone: string;
  now: Date;
}) {
  const c = booking.class;
  const phase = phaseOf(c.startTime, c.durationMin, now, timeZone);
  const imminent = phase === "today" || phase === "now";
  const online = c.format === "ONLINE";

  const venue = c.studio?.name ?? publicName(c.host);
  const place = c.studio
    ? [c.studio.address, c.studio.city].filter(Boolean).join(", ")
    : null;

  // Only actions the app can actually carry out.
  const directions = place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
    : null;

  const status =
    booking.status === "WAITLISTED"
      ? `Waitlist #${booking.waitlistPosition ?? "—"}`
      : booking.status === "PENDING_PAYMENT"
        ? "Payment pending"
        : phase === "now" && online && c.checkInCode
          ? "Check-in is open"
          : "Booked";

  return (
    <section
      className="stepup-card-in"
      aria-label="Your next class"
      style={{
        background: C.ink,
        color: C.onDark,
        borderRadius: 32,
        padding: "38px clamp(24px, 4vw, 40px) 36px",
        boxShadow: imminent ? `0 0 0 2px ${C.brand}` : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.08em",
            background: imminent ? C.brand : C.darkChip,
            color: imminent ? C.onBrand : C.darkChipInk,
          }}
        >
          {imminent && (
            <i
              aria-hidden
              className="stepup-pulse-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "currentColor",
              }}
            />
          )}
          {countdownLabel(phase, c.startTime, now, timeZone)}
        </span>
        <span style={{ fontSize: 13.5, color: C.onDarkBody }}>{status}</span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div style={{ flex: "1 1 340px", minWidth: 0 }}>
          <span style={{ ...styleChipStyle(c.style), fontSize: 12.5 }}>{c.style}</span>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(32px, 5vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              margin: "14px 0 16px",
            }}
          >
            {c.title}
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px 20px",
              marginBottom: 8,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" opacity="0.55" />
                <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 16.5, fontWeight: 600 }}>
                {formatClassDayTime(c.startTime, timeZone)}
              </span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              {online ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <rect x="2.5" y="4.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" opacity="0.55" />
                  <path d="M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                  <path
                    d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                    opacity="0.55"
                  />
                  <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              )}
              <span style={{ fontSize: 16.5, fontWeight: 600 }}>
                {online ? "Live online" : venue}
              </span>
            </span>
          </div>
          <div style={{ fontSize: 15, color: C.onDarkBody }}>
            {formatDuration(c.durationMin)} with {publicName(c.host)}
            {c.studio?.city ? ` · ${c.studio.city}` : ""}
          </div>
        </div>

        <div
          style={{
            flex: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 11,
            minWidth: 210,
          }}
        >
          {phase === "now" && online && c.onlineLink ? (
            <a href={c.onlineLink} target="_blank" rel="noreferrer" style={primaryBtn}>
              Join the class
            </a>
          ) : phase === "now" && !online && directions ? (
            <a href={directions} target="_blank" rel="noreferrer" style={primaryBtn}>
              Get directions
            </a>
          ) : (
            <Link href={`/classes/${booking.classId}`} style={primaryBtn}>
              Class details
            </Link>
          )}

          {/* Days out, the useful second action is getting it into your
              calendar. Once it is close, it is knowing where to go. */}
          {phase === "soon" ? (
            <a href={`/api/classes/${booking.classId}/calendar`} style={outlineDarkBtn}>
              Add to calendar
            </a>
          ) : online && c.onlineLink ? (
            <a href={c.onlineLink} target="_blank" rel="noreferrer" style={outlineDarkBtn}>
              Joining link
            </a>
          ) : directions ? (
            <a href={directions} target="_blank" rel="noreferrer" style={outlineDarkBtn}>
              Get directions
            </a>
          ) : (
            <a href={`/api/classes/${booking.classId}/calendar`} style={outlineDarkBtn}>
              Add to calendar
            </a>
          )}

          <div
            style={{
              textAlign: "center",
              fontSize: 12.5,
              color: "oklch(68% 0.015 70)",
              marginTop: 2,
            }}
          >
            {phase === "now"
              ? "This class has started"
              : "Free to cancel any time before it starts"}
          </div>
        </div>
      </div>
    </section>
  );
}

const primaryBtn: React.CSSProperties = {
  textAlign: "center",
  whiteSpace: "nowrap",
  fontWeight: 700,
  fontSize: 15.5,
  padding: "15px 26px",
  borderRadius: 999,
  background: C.brand,
  color: C.onBrand,
  textDecoration: "none",
};

const outlineDarkBtn: React.CSSProperties = {
  textAlign: "center",
  whiteSpace: "nowrap",
  fontWeight: 600,
  fontSize: 15,
  padding: "14px 24px",
  borderRadius: 999,
  background: "transparent",
  border: `1.5px solid ${C.darkBorder}`,
  color: "oklch(92% 0.01 70)",
  textDecoration: "none",
};

function EmptyHero() {
  return (
    <section
      className="stepup-card-in"
      aria-label="Your next class"
      style={{
        background: C.ink,
        color: C.onDark,
        borderRadius: 32,
        padding: "38px clamp(24px, 4vw, 40px) 36px",
      }}
    >
      <span
        style={{
          display: "inline-block",
          padding: "6px 14px",
          borderRadius: 999,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.08em",
          background: C.darkChip,
          color: C.darkChipInk,
        }}
      >
        NOTHING BOOKED
      </span>
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(32px, 5vw, 44px)",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          margin: "14px 0 16px",
        }}
      >
        No class booked yet.
      </h1>
      <p style={{ fontSize: 15, color: C.onDarkBody, margin: "0 0 24px", maxWidth: 420 }}>
        Once you book one it lands here, with everything you need to turn up in
        the right place at the right time.
      </p>
      <Link href="/discover" style={{ ...primaryBtn, display: "inline-block" }}>
        Find a class
      </Link>
    </section>
  );
}
