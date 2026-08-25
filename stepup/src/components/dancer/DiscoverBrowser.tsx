"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { ClassCard, type DiscoverClass } from "./ClassCard";

const TINT = "oklch(96.8% 0.01 72)";

export type Filters = { q: string; format: string; city: string; style: string };

/**
 * The whole browse surface below the header.
 *
 * Every upcoming class is handed down once and filtered in the browser, so
 * typing is instant. The chosen filters are mirrored into the URL with
 * `replace` so a filtered view is shareable and survives a refresh without
 * pushing a history entry per keystroke.
 */
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
  const router = useRouter();
  const [f, setF] = useState<Filters>(initial);

  useEffect(() => {
    const params = new URLSearchParams();
    if (f.q) params.set("q", f.q);
    if (f.format) params.set("format", f.format);
    if (f.city) params.set("city", f.city);
    if (f.style) params.set("style", f.style);
    const qs = params.toString();
    router.replace(qs ? `/discover?${qs}` : "/discover", { scroll: false });
  }, [f, router]);

  // `skip` lets the style rail count against the *other* filters, so each
  // chip shows what you would get by clicking it rather than what you have.
  const matches = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return (c: DiscoverClass, skip?: keyof Filters) =>
      (skip === "format" || !f.format || c.format === f.format) &&
      (skip === "style" || !f.style || c.style === f.style) &&
      (skip === "city" || !f.city || c.city === f.city) &&
      (!q ||
        `${c.title} ${c.style} ${c.venue} ${c.teacher}`.toLowerCase().includes(q));
  }, [f]);

  const results = useMemo(
    () => classes.filter((c) => matches(c)),
    [classes, matches]
  );

  const dirty = Boolean(f.q || f.format || f.city || f.style);
  const reset = () => setF({ q: "", format: "", city: "", style: "" });

  return (
    <>
      {/* ── TOOLBAR ──────────────────────────────────────────────────────── */}
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
          {/* Search */}
          <div
            style={{
              flex: "1 1 260px",
              minWidth: 180,
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "0 16px",
              height: 46,
              borderRadius: 999,
              background: TINT,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
              <circle cx="10.5" cy="10.5" r="6.5" stroke="oklch(55% 0.02 60)" strokeWidth="1.7" />
              <path d="M15.5 15.5L21 21" stroke="oklch(55% 0.02 60)" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              aria-label="Search classes"
              placeholder="Search a style, studio, or teacher"
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
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
            {f.q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setF({ ...f, q: "" })}
                style={{
                  flex: "none",
                  cursor: "pointer",
                  width: 20,
                  height: 20,
                  border: "none",
                  borderRadius: 999,
                  background: "oklch(88% 0.015 70)",
                  color: "oklch(40% 0.02 60)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Format — the one place a shadow is used, so it reads as a switch */}
          <div
            role="radiogroup"
            aria-label="Class format"
            style={{
              flex: "none",
              display: "flex",
              gap: 3,
              padding: 4,
              borderRadius: 999,
              background: TINT,
            }}
          >
            {[
              { value: "", label: "Any format" },
              { value: "IN_PERSON", label: "In person" },
              { value: "ONLINE", label: "Online" },
            ].map((opt) => {
              const on = f.format === opt.value;
              return (
                <button
                  key={opt.value || "any"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setF({ ...f, format: opt.value })}
                  style={{
                    flex: "none",
                    whiteSpace: "nowrap",
                    padding: "9px 17px",
                    border: "none",
                    borderRadius: 999,
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: on ? C.card : "transparent",
                    color: on ? C.ink : "oklch(50% 0.02 60)",
                    boxShadow: on ? "0 1px 3px oklch(22% 0.02 60 / 0.1)" : "none",
                    transition: "background 0.18s ease, color 0.18s ease",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Location */}
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
                background: TINT,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: "none" }}>
                <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="oklch(45% 0.02 60)" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" stroke="oklch(45% 0.02 60)" strokeWidth="1.7" />
              </svg>
              <select
                aria-label="Location"
                value={f.city}
                onChange={(e) => setF({ ...f, city: e.target.value })}
                style={{
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.ink,
                  paddingRight: 22,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="">Anywhere</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Style rail */}
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
            aria-label="Dance style"
            style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 7 }}
          >
            {["", ...styles].map((st) => {
              const on = f.style === st;
              const count = classes.filter(
                (c) => matches(c, "style") && (!st || c.style === st)
              ).length;
              return (
                <button
                  key={st || "all"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setF({ ...f, style: st })}
                  style={{
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    whiteSpace: "nowrap",
                    padding: "7px 13px 7px 15px",
                    borderRadius: 999,
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: on ? C.brand : "oklch(97% 0.008 70)",
                    // A zero-result style greys out but stays clickable — you
                    // need to see the option exists.
                    color: on
                      ? C.onBrand
                      : count
                        ? "oklch(45% 0.02 60)"
                        : "oklch(70% 0.015 70)",
                    border: `1.5px solid ${on ? C.brand : "oklch(92% 0.012 70)"}`,
                    transition: "background 0.15s ease, color 0.15s ease",
                  }}
                >
                  {st || "Everything"}
                  <span
                    style={{
                      minWidth: 18,
                      textAlign: "center",
                      padding: "1px 5px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: on ? "oklch(99% 0.005 70 / 0.22)" : "oklch(93% 0.012 70)",
                      color: on ? C.onBrand : "oklch(48% 0.02 60)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RESULT LINE ──────────────────────────────────────────────────── */}
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
        <div style={{ fontSize: 14.5, color: "oklch(48% 0.02 60)" }} aria-live="polite">
          {results.length === 1 ? "1 class matches" : `${results.length} classes match`}
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={!dirty}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: dirty ? "pointer" : "default",
            color: dirty ? C.brand : "oklch(72% 0.015 70)",
            pointerEvents: dirty ? "auto" : "none",
          }}
        >
          Reset all
        </button>
      </div>

      {/* ── RESULTS ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(330px, 100%), 1fr))",
          gap: 16,
        }}
      >
        {results.map((c, i) => (
          <ClassCard key={c.id} c={c} index={i} />
        ))}

        {/* Always the last cell, so a thin result set still reads as a page. */}
        <div
          style={{
            border: `1.5px dashed ${C.dashed}`,
            borderRadius: 24,
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "oklch(98.5% 0.008 70)",
          }}
        >
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, margin: "0 0 8px" }}>
            {results.length ? "Not quite it?" : "Nothing matches yet"}
          </h3>
          <p style={{ fontSize: 14.5, color: "oklch(50% 0.02 60)", margin: "0 0 20px" }}>
            {results.length
              ? "Tell us the style and night that would suit you, and we will let you know the moment a studio posts one."
              : "No classes fit those filters right now. Tell us what you are after and we will let you know when one lands."}
          </p>
          <a
            href="mailto:hello@stepup.dance?subject=Class%20request"
            style={{
              alignSelf: "flex-start",
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: 14.5,
              padding: "12px 22px",
              borderRadius: 999,
              border: `1.5px solid ${C.brand}`,
              color: C.brand,
              textDecoration: "none",
            }}
          >
            Notify me
          </a>
        </div>
      </div>
    </>
  );
}
