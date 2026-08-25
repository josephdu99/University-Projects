"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { bookClassAction } from "@/lib/actions/class-actions";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { styleChipStyle } from "@/lib/style-chips";

/** Serialisable shape the server page hands down — dates already formatted. */
export type DiscoverClass = {
  id: string;
  title: string;
  style: string;
  format: "IN_PERSON" | "ONLINE";
  level: string;
  levelRank: number;
  venue: string;
  city: string;
  teacher: string;
  month: string;
  day: string;
  time: string;
  duration: string;
  price: string;
  booked: number;
  capacity: number;
  bookingStatus?: string;
};

/** Fewer than this and the copy switches to scarcity — only ever when true. */
const TIGHT = 5;

export function ClassCard({ c, index }: { c: DiscoverClass; index: number }) {
  const left = Math.max(c.capacity - c.booked, 0);
  const tight = left > 0 && left <= TIGHT;
  const full = left === 0;
  const online = c.format === "ONLINE";

  return (
    <div
      className="stepup-card"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        animation: `stepup-card-in 0.4s ease-out ${index * 0.05}s both`,
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Chips + price */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
          <span style={styleChipStyle(c.style)}>{c.style}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 11px",
              borderRadius: 999,
              background: "oklch(95.5% 0.008 70)",
              color: "oklch(45% 0.02 60)",
              whiteSpace: "nowrap",
            }}
          >
            {online ? "Online" : "In person"}
          </span>
          <LevelChip label={c.level} rank={c.levelRank} />
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 17,
            whiteSpace: "nowrap",
            flex: "none",
          }}
        >
          {c.price}
        </div>
      </div>

      <h2
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: "-0.01em",
          margin: "0 0 10px",
        }}
      >
        <Link href={`/classes/${c.id}`} style={{ color: C.ink, textDecoration: "none" }}>
          {c.title}
        </Link>
      </h2>

      {/* The city pill is the highest-contrast thing in the card body on
          purpose — where a class is was the hardest thing to spot before. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
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
          {online ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
              <rect x="2.5" y="4.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
              <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
          {c.city}
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "oklch(38% 0.02 60)" }}>
          {c.venue}
        </span>
      </div>

      {/* When */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 0",
          borderTop: "1px solid oklch(93% 0.008 70)",
          borderBottom: "1px solid oklch(93% 0.008 70)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: "none",
            width: 52,
            textAlign: "center",
            padding: "6px 0",
            borderRadius: 12,
            background: C.dateTile,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "oklch(55% 0.03 60)",
            }}
          >
            {c.month}
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>
            {c.day}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 2 }}>{c.time}</div>
          <div style={{ fontSize: 13.5, color: "oklch(52% 0.02 60)" }}>
            {c.duration} with {c.teacher}
          </div>
        </div>
      </div>

      {/* Availability */}
      <div style={{ fontSize: 13.5, color: "oklch(50% 0.02 60)", marginBottom: 9 }}>
        {full
          ? "Fully booked, join the waitlist"
          : tight
            ? `Only ${left} ${left === 1 ? "spot" : "spots"} left`
            : `${left} of ${c.capacity} spots open`}
      </div>
      <div
        aria-hidden
        style={{
          height: 6,
          borderRadius: 999,
          background: "oklch(93% 0.01 70)",
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          className="stepup-grow"
          style={{
            height: "100%",
            width: `${Math.max((c.booked / Math.max(c.capacity, 1)) * 100, 2)}%`,
            borderRadius: 999,
            background: tight || full ? "oklch(58% 0.17 35)" : C.brand,
            transformOrigin: "left",
            animation: "stepup-seg-grow 0.7s ease-out both",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
        <BookSpot classId={c.id} full={full} status={c.bookingStatus} />
      </div>
    </div>
  );
}

/** Squared, metered, and typographically distinct so it never reads as a tag. */
function LevelChip({ label, rank }: { label: string; rank: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "3px 9px",
        borderRadius: 7,
        border: "1.2px solid oklch(87% 0.014 70)",
        background: "transparent",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "flex", alignItems: "flex-end", gap: 2 }} aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            style={{
              width: 3,
              height: 3 + n * 2.5,
              borderRadius: 1,
              // Rank 0 means "all levels", which fills the whole meter.
              background:
                rank === 0 || n <= rank ? "oklch(58% 0.03 60)" : "oklch(88% 0.014 70)",
            }}
          />
        ))}
      </span>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "oklch(45% 0.02 60)",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function BookSpot({
  classId,
  full,
  status,
}: {
  classId: string;
  full: boolean;
  status?: string;
}) {
  const [state, formAction] = useActionState(bookClassAction, undefined);

  const settled = state && "success" in state ? state.status : status;

  if (settled === "BOOKED" || settled === "ATTENDED") {
    return <Settled tone="success">You&apos;re booked</Settled>;
  }
  if (settled === "WAITLISTED") {
    return <Settled tone="gold">On the waitlist</Settled>;
  }
  if (settled === "PENDING_PAYMENT") {
    return <Settled tone="gold">Payment pending</Settled>;
  }

  return (
    <form action={formAction} style={{ flex: 1 }}>
      <input type="hidden" name="classId" value={classId} />
      {state && "error" in state && (
        <p
          role="alert"
          style={{ fontSize: 12.5, color: "oklch(45% 0.16 25)", margin: "0 0 8px" }}
        >
          {state.error}
        </p>
      )}
      <BookSubmit full={full} />
    </form>
  );
}

function BookSubmit({ full }: { full: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        textAlign: "center",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: 15,
        padding: 13,
        border: "none",
        borderRadius: 999,
        background: pending ? C.disabledBg : C.brand,
        color: pending ? C.disabledInk : C.onBrand,
        cursor: pending ? "not-allowed" : "pointer",
      }}
    >
      {pending ? "Booking…" : full ? "Join the waitlist" : "Book my spot"}
    </button>
  );
}

function Settled({
  tone,
  children,
}: {
  tone: "success" | "gold";
  children: React.ReactNode;
}) {
  const palette =
    tone === "success"
      ? { bg: "oklch(94% 0.06 155)", fg: "oklch(42% 0.11 155)" }
      : { bg: "oklch(95% 0.06 85)", fg: "oklch(45% 0.11 70)" };

  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        padding: 13,
        borderRadius: 999,
        background: palette.bg,
        color: palette.fg,
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      {children}
    </div>
  );
}
