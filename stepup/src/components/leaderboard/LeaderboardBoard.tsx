"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  EVERYWHERE,
  METRICS,
  type BoardRow,
  type Metric,
  type RankedRow,
  nextUpFrom,
  rankBoard,
} from "@/lib/leaderboard";

/** Rows rendered below the podium before the list is cut off. */
const VISIBLE_ROWS = 22;

const ORDINALS = ["1st", "2nd", "3rd"];
const SINGULAR: Record<Metric, string> = { classes: "class", styles: "style" };

const METRIC_OPTIONS = (Object.keys(METRICS) as Metric[]).map((key) => ({
  value: key,
  label: METRICS[key].label,
}));

function ordinal(n: number) {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]);
}

function countOf(n: number, metric: Metric) {
  return `${n} ${n === 1 ? SINGULAR[metric] : METRICS[metric].unit}`;
}

export function LeaderboardBoard({
  rows,
  cities,
  initialMetric,
  initialCity,
  viewerOptedIn,
}: {
  rows: BoardRow[];
  cities: string[];
  initialMetric: Metric;
  initialCity: string;
  viewerOptedIn: boolean;
}) {
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const [city, setCity] = useState(initialCity);

  // Mirrored into the URL so a view is shareable and survives a refresh.
  // replaceState rather than the router: switching a metric is not a
  // navigation and should not stack up history entries.
  useEffect(() => {
    const params = new URLSearchParams({ metric, city });
    window.history.replaceState(null, "", `?${params}`);
  }, [metric, city]);

  const board = useMemo(() => rankBoard(rows, metric, city), [rows, metric, city]);

  const podium = board.slice(0, 3);
  const rest = board.slice(3, VISIBLE_ROWS + 3);

  // If the viewer ranks past the cut, pin their row to the bottom rather than
  // dropping them — the board is meant to tell them where they stand.
  const viewerIndex = board.findIndex((r) => r.isViewer);
  const viewerRow = viewerIndex === -1 ? null : board[viewerIndex];
  const pinned =
    viewerRow && viewerIndex >= VISIBLE_ROWS + 3 ? viewerRow : null;

  const scopeLabel = city === EVERYWHERE ? "overall" : `in ${city}`;
  // Keyed so React remounts the rows on a switch and the entrance animation
  // replays — that movement is what signals the ranking changed.
  const runKey = `${metric}|${city}`;

  return (
    <>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(30px, 5vw, 40px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 10px",
            }}
          >
            Who&apos;s on the floor
          </h1>
          <p
            style={{
              fontSize: 17,
              color: C.navInactive,
              margin: 0,
              maxWidth: 520,
            }}
          >
            {METRICS[metric].subhead}
          </p>
        </div>

        {cities.length > 0 && (
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 9,
              height: 46,
              padding: "0 8px 0 16px",
              borderRadius: 999,
              background: "oklch(96.8% 0.01 72)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style={{ flex: "none" }}
            >
              <path
                d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                stroke="oklch(45% 0.02 60)"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="2.5"
                stroke="oklch(45% 0.02 60)"
                strokeWidth="1.7"
              />
            </svg>
            <label className="sr-only" htmlFor="leaderboard-city">
              City
            </label>
            <select
              id="leaderboard-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                // The design strips the native control and reserves 22px on
                // the right; the chevron goes back in there, because a select
                // with no affordance does not read as one.
                appearance: "none",
                border: "none",
                background:
                  "transparent url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23736457' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") no-repeat right 8px center",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                color: C.ink,
                paddingRight: 22,
              }}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={EVERYWHERE}>{EVERYWHERE}</option>
            </select>
          </div>
        )}
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <SegmentedControl
          label="Ranking metric"
          value={metric}
          options={METRIC_OPTIONS}
          onChange={setMetric}
        />
      </div>

      {board.length === 0 ? (
        <EmptyBoard city={city} />
      ) : (
        <>
          <section
            key={`podium-${runKey}`}
            aria-label="Top three"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {podium.map((row, i) => (
              <PodiumCard key={row.userId} row={row} index={i} metric={metric} />
            ))}
          </section>

          {(rest.length > 0 || pinned) && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 16,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 24,
                overflow: "hidden",
              }}
            >
              <caption className="sr-only">
                Leaderboard, positions four and below
              </caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Dancer</th>
                  <th scope="col">{METRICS[metric].label}</th>
                </tr>
              </thead>
              <tbody key={`rows-${runKey}`}>
                {rest.map((row, i) => (
                  <BoardTableRow
                    key={row.userId}
                    row={row}
                    delay={Math.min(i * 0.04, 0.4)}
                    metric={metric}
                    first={i === 0}
                  />
                ))}
                {pinned && (
                  <BoardTableRow row={pinned} delay={0.4} metric={metric} />
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      <Standing
        board={board}
        viewerIndex={viewerIndex}
        metric={metric}
        scopeLabel={scopeLabel}
        viewerOptedIn={viewerOptedIn}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "22px 26px",
          borderRadius: 20,
          background: C.bgAlt,
        }}
      >
        <p
          style={{
            fontSize: 13.5,
            color: C.inkSoft,
            margin: 0,
            maxWidth: 600,
          }}
        >
          Boards reset on the first of the month and only include dancers who
          chose to appear. Nobody is ranked on how much they spend, and studios
          cannot see your position.
        </p>
        <Link
          href="/profile#visibility"
          style={{
            whiteSpace: "nowrap",
            fontSize: 13.5,
            fontWeight: 600,
            color: C.brand,
            textDecoration: "none",
          }}
        >
          {viewerOptedIn ? "Hide me from boards" : "Show me on boards"}
        </Link>
      </div>
    </>
  );
}

function avatarStyle(row: BoardRow, size: number, font: number) {
  return {
    width: size,
    height: size,
    flex: "none" as const,
    borderRadius: 999,
    background: `oklch(89% 0.055 ${row.hue})`,
    color: `oklch(35% 0.09 ${row.hue})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: font,
  };
}

function metaLine(row: RankedRow, metric: Metric) {
  const other: Metric = metric === "classes" ? "styles" : "classes";
  const stat = `${countOf(row.secondary, other)} this month`;
  return row.city ? `${row.city} · ${stat}` : stat;
}

function PodiumCard({
  row,
  index,
  metric,
}: {
  row: RankedRow;
  index: number;
  metric: Metric;
}) {
  const lead = index === 0;

  return (
    <article
      className="stepup-row-in"
      style={{
        borderRadius: 24,
        padding: 26,
        border: `1px solid ${lead ? C.ink : C.border}`,
        background: lead ? C.ink : C.card,
        color: lead ? C.onDark : C.ink,
        animationDelay: `${(index * 0.06).toFixed(2)}s`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: lead ? C.darkChipInk : "oklch(55% 0.02 60)",
          }}
        >
          {ORDINALS[index] ?? ordinal(row.rank)}
        </div>
        {row.isViewer && <ViewerPill row={row} onDark={lead} />}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div aria-hidden style={avatarStyle(row, 46, 16)}>
          {row.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 2,
            }}
          >
            {row.name}
          </div>
          <div
            style={{
              fontSize: 13.5,
              color: lead ? C.onDarkBody : C.label,
            }}
          >
            {metaLine(row, metric)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <b
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {row.value}
        </b>
        <span style={{ fontSize: 14, color: lead ? C.onDarkBody : C.label }}>
          {row.value === 1 ? SINGULAR[metric] : METRICS[metric].unit}
        </span>
      </div>
    </article>
  );
}

/**
 * Marks the viewer's own row as text, not just with the amber tint — colour
 * alone is not a marker anyone can hear. When the viewer is opted out it also
 * says so, because their row is on screen for them and for nobody else.
 */
function ViewerPill({ row, onDark = false }: { row: BoardRow; onDark?: boolean }) {
  const label = row.privateToViewer ? "ONLY VISIBLE TO YOU" : "YOU";
  return (
    <span
      style={{
        whiteSpace: "nowrap",
        padding: "3px 10px",
        borderRadius: 999,
        background: onDark ? "oklch(97% 0.01 70 / 0.12)" : C.brand,
        color: onDark ? C.onDark : C.onBrand,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

function BoardTableRow({
  row,
  delay,
  metric,
  first = false,
}: {
  row: RankedRow;
  delay: number;
  metric: Metric;
  /** The divider sits *between* rows, so the first one has none. */
  first?: boolean;
}) {
  const cell = {
    padding: "16px 24px",
    verticalAlign: "middle" as const,
    borderTop: first ? undefined : `1px solid ${C.rowDivider}`,
    background: row.isViewer ? "oklch(96.5% 0.03 85)" : undefined,
  };

  return (
    <tr className="stepup-row-in" style={{ animationDelay: `${delay.toFixed(2)}s` }}>
      <td
        style={{
          ...cell,
          width: 34,
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 16,
          color: C.label,
        }}
      >
        {row.rank}
      </td>
      <td style={{ ...cell, width: 62, paddingRight: 0 }}>
        <div aria-hidden style={avatarStyle(row, 38, 14)}>
          {row.initials}
        </div>
      </td>
      <td style={cell}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>
            {row.name}
          </span>
          {row.isViewer && <ViewerPill row={row} />}
        </div>
        <div style={{ fontSize: 13.5, color: C.label }}>
          {metaLine(row, metric)}
        </div>
      </td>
      <td
        style={{
          ...cell,
          width: 64,
          textAlign: "right",
          whiteSpace: "nowrap",
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 19,
        }}
      >
        {row.value}
      </td>
    </tr>
  );
}

function Standing({
  board,
  viewerIndex,
  metric,
  scopeLabel,
  viewerOptedIn,
}: {
  board: RankedRow[];
  viewerIndex: number;
  metric: Metric;
  scopeLabel: string;
  viewerOptedIn: boolean;
}) {
  const me = viewerIndex === -1 ? null : board[viewerIndex];
  const nextUp = me ? nextUpFrom(board, viewerIndex) : null;

  const title = me
    ? `You're ${ordinal(me.rank)} of ${board.length} ${scopeLabel}.`
    : "You are not on this board yet.";

  const body = me
    ? [
        `${countOf(me.value, metric)} this month.`,
        nextUp &&
          `${nextUp.gap === 1 ? "One" : nextUp.gap} more ${
            nextUp.gap === 1 ? SINGULAR[metric] : METRICS[metric].unit
          } would put you level with ${nextUp.name}.`,
        me.privateToViewer &&
          "You are hidden from this board — nobody else can see your row.",
      ]
        .filter(Boolean)
        .join(" ")
    : "Book a class this month and you will show up here.";

  return (
    <section
      style={{
        background: C.ink,
        color: C.onDark,
        borderRadius: 28,
        padding: "32px clamp(22px, 4vw, 36px)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 28,
        marginBottom: 16,
      }}
    >
      <div style={{ flex: "1 1 380px" }}>
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
          YOUR STANDING
        </div>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 27,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 15,
            color: C.onDarkBody,
            margin: 0,
            maxWidth: 420,
          }}
        >
          {body}
        </p>
      </div>

      <div style={{ flex: "none", display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link
          href="/discover"
          style={{
            whiteSpace: "nowrap",
            fontWeight: 700,
            fontSize: 15,
            padding: "14px 24px",
            borderRadius: 999,
            background: C.brand,
            color: C.onBrand,
            textDecoration: "none",
          }}
        >
          Book a class
        </Link>
        {!viewerOptedIn && (
          <Link
            href="/profile#visibility"
            style={{
              whiteSpace: "nowrap",
              fontWeight: 600,
              fontSize: 15,
              padding: "14px 24px",
              borderRadius: 999,
              border: `1.5px solid ${C.darkBorder}`,
              color: "oklch(92% 0.01 70)",
              textDecoration: "none",
            }}
          >
            Appear on the board
          </Link>
        )}
      </div>
    </section>
  );
}

function EmptyBoard({ city }: { city: string }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px dashed ${C.dashed}`,
        borderRadius: 24,
        padding: "40px 26px",
        textAlign: "center",
        marginBottom: 16,
      }}
    >
      <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, margin: 0 }}>
        {city === EVERYWHERE
          ? "Nobody is on the board this month yet."
          : `Nobody in ${city} is on the board this month yet.`}
      </p>
      <p style={{ fontSize: 14.5, color: C.label, margin: "6px 0 0" }}>
        Dancers appear here once they attend a class and choose to be listed.
      </p>
    </div>
  );
}
