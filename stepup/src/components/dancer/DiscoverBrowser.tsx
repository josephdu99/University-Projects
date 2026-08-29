"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { styleChipStyle } from "@/lib/style-chips";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { BookButton } from "@/components/classes/BookButton";

export type DiscoverClass = {
  id: string;
  title: string;
  style: string;
  format: "In person" | "Online";
  level: string;
  city: string;
  venue: string;
  teacher: string;
  month: string;
  day: string;
  time: string;
  length: string;
  price: string;
  booked: number;
  capacity: number;
  bookingStatus: string | null;
};

type Filters = { format: string; style: string; city: string; q: string };

const ALL = "All";
const FORMATS = [ALL, "In person", "Online"];

/** How many of the three level bars are lit. ALL_LEVELS lights every one. */
const LEVEL_BARS: Record<string, number> = {
  ALL_LEVELS: 3,
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};
const LEVEL_LABEL: Record<string, string> = {
  ALL_LEVELS: "All levels",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export function DiscoverBrowser({
  classes,
  styles,
  cities,
  initial,
}: {
  classes: DiscoverClass[];
  styles: string[];
  cities: string[];
  initial: Filters;
}) {
  const [filters, setFilters] = useState<Filters>(initial);
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  // Mirrored into the URL so a filtered view is shareable and survives refresh.
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.format !== ALL) next.set("format", filters.format);
    if (filters.style !== ALL) next.set("style", filters.style);
    if (filters.city !== ALL) next.set("city", filters.city);
    if (filters.q) next.set("q", filters.q);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  // `skip` lets a facet count itself as though its own filter were off, so the
  // style counts stay useful instead of collapsing to the current selection.
  const matches = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return (c: DiscoverClass, skip?: keyof Filters) =>
      (skip === "format" || filters.format === ALL || c.format === filters.format) &&
      (skip === "style" || filters.style === ALL || c.style === filters.style) &&
      (skip === "city" || filters.city === ALL || c.city === filters.city) &&
      (!q ||
        `${c.title} ${c.style} ${c.venue} ${c.teacher}`.toLowerCase().includes(q));
  }, [filters]);

  const results = classes.filter((c) => matches(c));
  const dirty =
    filters.format !== ALL ||
    filters.style !== ALL ||
    filters.city !== ALL ||
    Boolean(filters.q);

  const styleOptions = [ALL, ...styles];

  return (
    <>
      <header style={{ marginBottom: 28 }}>
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
          Find your next class
        </h1>
        <p style={{ fontSize: 17, color: C.navInactive, margin: 0 }}>
          In person or online, one tap to book your spot.
        </p>
      </header>

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 26,
          padding: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            padding: "6px 6px 10px",
          }}
        >
          <div
            style={{
              flex: "1 1 260px",
              minWidth: 200,
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "0 16px",
              height: 46,
              borderRadius: 999,
              background: "oklch(96.8% 0.01 72)",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
              <circle cx="10.5" cy="10.5" r="6.5" stroke="oklch(55% 0.02 60)" strokeWidth="1.7" />
              <path d="M15.5 15.5L21 21" stroke="oklch(55% 0.02 60)" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <label className="sr-only" htmlFor="discover-q">
              Search classes
            </label>
            <input
              id="discover-q"
              type="text"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search a style, studio, or teacher"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                fontFamily: "inherit",
                fontSize: 15,
                color: C.ink,
                outline: "none",
              }}
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => set({ q: "" })}
                aria-label="Clear search"
                style={{
                  flex: "none",
                  cursor: "pointer",
                  border: "none",
                  width: 20,
                  height: 20,
                  padding: 0,
                  borderRadius: 999,
                  background: "oklch(88% 0.015 70)",
                  color: "oklch(40% 0.02 60)",
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>

          <SegmentedControl
            label="Class format"
            value={filters.format}
            options={FORMATS.map((f) => ({
              value: f,
              label: f === ALL ? "Any format" : f,
            }))}
            onChange={(format) => set({ format })}
          />

          {cities.length > 1 && (
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                <path
                  d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                  stroke="oklch(45% 0.02 60)"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="10" r="2.5" stroke="oklch(45% 0.02 60)" strokeWidth="1.7" />
              </svg>
              <label className="sr-only" htmlFor="discover-city">
                Location
              </label>
              <select
                id="discover-city"
                value={filters.city}
                onChange={(e) => set({ city: e.target.value })}
                style={{
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
                <option value={ALL}>Anywhere</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 8px 6px",
            borderTop: "1px solid oklch(94% 0.008 70)",
          }}
        >
          <span
            id="style-label"
            style={{
              flex: "none",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "oklch(58% 0.02 60)",
            }}
          >
            Style
          </span>
          <div
            role="radiogroup"
            aria-labelledby="style-label"
            style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 7 }}
          >
            {styleOptions.map((s) => {
              const count = classes.filter(
                (c) => matches(c, "style") && (s === ALL || c.style === s)
              ).length;
              const on = filters.style === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ style: s })}
                  style={{
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    whiteSpace: "nowrap",
                    padding: "7px 13px 7px 15px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 600,
                    background: on ? C.brand : "oklch(97% 0.008 70)",
                    color: on
                      ? C.onBrand
                      : count === 0
                        ? "oklch(70% 0.015 70)"
                        : "oklch(45% 0.02 60)",
                    border: `1.5px solid ${on ? C.brand : "oklch(92% 0.012 70)"}`,
                    transition: "background 0.15s ease, color 0.15s ease",
                  }}
                >
                  {s === ALL ? "Everything" : s}
                  <b
                    style={{
                      minWidth: 18,
                      textAlign: "center",
                      padding: "1px 5px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: on
                        ? "oklch(99% 0.005 70 / 0.22)"
                        : "oklch(93% 0.012 70)",
                      color: on ? C.onBrand : "oklch(48% 0.02 60)",
                    }}
                  >
                    {count}
                  </b>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
          padding: "0 4px",
        }}
      >
        <p role="status" style={{ fontSize: 14.5, color: C.navInactive, margin: 0 }}>
          {results.length === 1 ? "1 class matches" : `${results.length} classes match`}
        </p>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setFilters({ format: ALL, style: ALL, city: ALL, q: "" })}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: dirty ? "pointer" : "default",
            color: dirty ? C.brand : "oklch(72% 0.015 70)",
          }}
        >
          Reset all
        </button>
      </div>

      <section
        aria-label="Matching classes"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: 16,
        }}
      >
        {results.map((c, i) => (
          <ClassCard key={c.id} data={c} delay={Math.min(i * 0.05, 0.4)} />
        ))}

        {results.length === 0 && (
          <div
            style={{
              border: `1.5px dashed ${C.dashed}`,
              borderRadius: 24,
              padding: "32px 28px",
              background: "oklch(98.5% 0.008 70)",
            }}
          >
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 19,
                margin: "0 0 8px",
              }}
            >
              Nothing matches yet
            </h3>
            <p style={{ fontSize: 14.5, color: "oklch(50% 0.02 60)", margin: "0 0 20px" }}>
              No classes fit those filters right now. Widen them and see what
              else is on.
            </p>
            <button
              type="button"
              onClick={() => setFilters({ format: ALL, style: ALL, city: ALL, q: "" })}
              style={{
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 14.5,
                padding: "12px 22px",
                borderRadius: 999,
                background: "transparent",
                border: `1.5px solid ${C.brand}`,
                color: C.brand,
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function ClassCard({ data, delay }: { data: DiscoverClass; delay: number }) {
  const left = data.capacity - data.booked;
  const tight = left <= 5;
  const full = left <= 0;
  const fill = Math.max((data.booked / data.capacity) * 100, 2);
  const lit = LEVEL_BARS[data.level] ?? 3;
  const online = data.format === "Online";

  return (
    <article
      className="stepup-card-in"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        animationDelay: `${delay.toFixed(2)}s`,
      }}
    >
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
          <span style={styleChipStyle(data.style)}>{data.style}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 11px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              background: "oklch(95.5% 0.008 70)",
              color: "oklch(45% 0.02 60)",
            }}
          >
            {data.format}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "3px 9px",
              borderRadius: 7,
              border: "1.2px solid oklch(87% 0.014 70)",
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
              {[1, 2, 3].map((n) => (
                <i
                  key={n}
                  style={{
                    width: 3,
                    height: 3 + n * 2.5,
                    borderRadius: 1,
                    background: n <= lit ? "oklch(58% 0.03 60)" : "oklch(88% 0.014 70)",
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
              {LEVEL_LABEL[data.level] ?? data.level}
            </span>
          </span>
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
          {data.price}
        </div>
      </div>

      <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", margin: "0 0 10px" }}>
        <Link href={`/classes/${data.id}`} style={{ color: "inherit", textDecoration: "none" }}>
          {data.title}
        </Link>
      </h2>

      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 18 }}>
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
          {online ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
              <rect x="2.5" y="4.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
              <path
                d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
          {data.city}
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "oklch(38% 0.02 60)" }}>
          {data.venue}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 0",
          borderTop: `1px solid ${C.rowDivider}`,
          borderBottom: `1px solid ${C.rowDivider}`,
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
              textTransform: "uppercase",
            }}
          >
            {data.month}
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>
            {data.day}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 2 }}>{data.time}</div>
          <div style={{ fontSize: 13.5, color: C.label }}>
            {data.length} with {data.teacher}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 9 }}>
        <span style={{ fontSize: 13.5, color: "oklch(50% 0.02 60)" }}>
          {full
            ? "Full — join the waitlist"
            : tight
              ? `Only ${left} ${left === 1 ? "spot" : "spots"} left`
              : `${left} of ${data.capacity} spots open`}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${data.booked} of ${data.capacity} spots taken`}
        style={{
          height: 6,
          borderRadius: 999,
          background: C.barTrack,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          className="stepup-grow"
          style={{
            height: "100%",
            width: `${fill}%`,
            borderRadius: 999,
            background: tight ? "oklch(58% 0.17 35)" : C.brand,
            transformOrigin: "left",
          }}
        />
      </div>

      <div style={{ marginTop: "auto" }}>
        <BookingAction data={data} full={full} />
      </div>
    </article>
  );
}

/** Keeps the existing booking states — the design only draws the fresh one. */
function BookingAction({ data, full }: { data: DiscoverClass; full: boolean }) {
  const done: Record<string, { label: string; bg: string; fg: string }> = {
    BOOKED: { label: "Booked ✓", bg: "oklch(95% 0.05 145)", fg: "oklch(45% 0.13 145)" },
    ATTENDED: { label: "Attended ✓", bg: "oklch(95% 0.05 145)", fg: "oklch(45% 0.13 145)" },
    WAITLISTED: { label: "On the waitlist", bg: C.nudgeBg, fg: C.nudgeInk },
    PENDING_PAYMENT: { label: "Payment pending", bg: "oklch(95.5% 0.008 70)", fg: C.label },
  };

  const state = data.bookingStatus ? done[data.bookingStatus] : undefined;
  if (state) {
    return (
      <div
        style={{
          padding: "13px",
          borderRadius: 999,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 15,
          background: state.bg,
          color: state.fg,
        }}
      >
        {state.label}
      </div>
    );
  }

  return (
    <div className="stepup-book">
      <BookButton
        classId={data.id}
        isFull={full}
        label={full ? "Join the waitlist" : "Book my spot"}
      />
    </div>
  );
}
