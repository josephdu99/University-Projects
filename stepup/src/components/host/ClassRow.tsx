import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { styleChipStyle } from "@/lib/style-chips";
import { dateBlockParts, formatDuration, formatMoney } from "@/lib/time";
import type { HostClass } from "@/lib/host-data";

/**
 * One class as a dense hairline-divided row: date block, title and style chip,
 * price, fill bar, and a single action. Replaces the four fat cards the old
 * dashboard used, which gave four classes the same weight as the whole page.
 */
export function ClassRow({
  c,
  base,
  first,
  action,
}: {
  c: HostClass;
  base: "/studio";
  first: boolean;
  /** Past classes offer "Run again"; upcoming ones offer "Manage". */
  action: "manage" | "runAgain";
}) {
  const { month, day, time } = dateBlockParts(c.startTime, c.timezone);
  const fillPct = c.capacity > 0 ? (c.booked / c.capacity) * 100 : 0;

  return (
    <div
      className="stepup-row"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 20,
        padding: "20px clamp(16px, 2.5vw, 26px)",
        borderTop: first ? undefined : `1px solid ${C.rowDivider}`,
        transition: "background 0.15s ease",
      }}
    >
      <div
        style={{
          flex: "none",
          width: 56,
          textAlign: "center",
          padding: "8px 0",
          borderRadius: 14,
          background: C.dateTile,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "oklch(55% 0.03 60)",
          }}
        >
          {month}
        </div>
        <div
          style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}
        >
          {day}
        </div>
      </div>

      <div style={{ flex: "1 1 240px", minWidth: 170 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, margin: 0 }}>
            <Link
              href={`${base}/classes/${c.id}`}
              style={{ color: C.ink, textDecoration: "none" }}
            >
              {c.title}
            </Link>
          </h3>
          <span style={styleChipStyle(c.style)}>{c.style}</span>
          {c.cancelledAt && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 11px",
                borderRadius: 999,
                background: C.barTrack,
                color: C.inkSoft,
              }}
            >
              Cancelled
            </span>
          )}
        </div>
        <div style={{ fontSize: 13.5, color: C.meta }}>
          {time} · {formatDuration(c.durationMin)} ·{" "}
          {c.format === "ONLINE" ? "Online" : "In person"}
          {c.seriesId ? " · Weekly" : ""}
        </div>
      </div>

      <div
        style={{
          flex: "none",
          width: 90,
          textAlign: "right",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {c.priceCents === 0 ? "Free" : formatMoney(c.priceCents, c.currency)}
      </div>

      <div
        style={{ flex: "none", width: 170, display: "flex", alignItems: "center", gap: 12 }}
      >
        {/* The bar is decoration; the ratio beside it is the accessible value. */}
        <div
          aria-hidden
          style={{
            flex: 1,
            height: 6,
            borderRadius: 999,
            background: C.barTrack,
            overflow: "hidden",
          }}
        >
          <div
            className="stepup-grow"
            style={{
              height: "100%",
              // A zero-booking class still shows a sliver so the bar reads as a
              // track rather than looking broken.
              width: `${Math.max(fillPct, 2)}%`,
              borderRadius: 999,
              background: c.booked > 0 ? C.brand : C.barEmpty,
              transformOrigin: "left",
              animation: "stepup-seg-grow 0.7s ease-out both",
            }}
          />
        </div>
        <div style={{ flex: "none", fontSize: 13, color: "oklch(50% 0.02 60)", whiteSpace: "nowrap" }}>
          <strong
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 14.5,
              color: C.ink,
            }}
          >
            {c.booked}
          </strong>
          /{c.capacity}
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            {" "}
            booked of {c.capacity} spots
          </span>
        </div>
      </div>

      <Link
        href={
          action === "runAgain"
            ? `${base}/classes/new?from=${c.id}`
            : `${base}/classes/${c.id}`
        }
        className="stepup-ghost-pill"
        style={{
          flex: "none",
          fontSize: 13.5,
          fontWeight: 600,
          padding: "9px 16px",
          borderRadius: 999,
          border: `1px solid oklch(89% 0.012 70)`,
          color: "oklch(38% 0.02 60)",
          textDecoration: "none",
        }}
      >
        {action === "runAgain" ? "Run again" : "Manage"}
      </Link>
    </div>
  );
}

export function ClassRowList({
  classes,
  base,
  action,
}: {
  classes: HostClass[];
  base: "/studio";
  action: "manage" | "runAgain";
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {classes.map((c, i) => (
        <ClassRow key={c.id} c={c} base={base} first={i === 0} action={action} />
      ))}
    </div>
  );
}
