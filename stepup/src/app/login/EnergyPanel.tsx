"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { TESTIMONIALS, LOGIN_ROTATING_LINES } from "@/lib/marketing-content";

const BAR_COUNT = 16;
const ROTATE_MS = 4200;

/**
 * Each entry is either a real testimonial (quoted, with attribution) or one of
 * the product lines we fall back to while there are no real quotes. Building
 * one list up front keeps the rotation logic identical either way.
 */
const LINES: { text: string; author?: string }[] =
  TESTIMONIALS.length > 0
    ? TESTIMONIALS.map((t) => ({
        text: `"${t.quote}"`,
        author: `${t.name}, ${t.role}`,
      }))
    : LOGIN_ROTATING_LINES.map((text) => ({ text }));

export function EnergyPanel({
  stats,
}: {
  stats: { value: string; label: string }[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (LINES.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % LINES.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, []);

  const line = LINES[index];

  return (
    <div
      style={{
        flex: "1 1 460px",
        minWidth: 280,
        background: C.ink,
        color: C.onDark,
        padding: "clamp(28px, 5vw, 48px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 40,
        position: "relative",
        overflow: "hidden",
        // Only bites when the panel wraps onto its own row on narrow screens —
        // side by side it stretches to the full viewport height instead.
        minHeight: 340,
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: C.onDark,
          textDecoration: "none",
          alignSelf: "flex-start",
        }}
      >
        StepUp
      </Link>

      <div>
        {/* Decorative — conveys nothing a screen reader needs to announce. */}
        <div
          aria-hidden
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 5,
            height: 64,
            marginBottom: 32,
          }}
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <div
              key={i}
              className="stepup-eq-bar"
              style={{
                width: 6,
                height: 64,
                borderRadius: 3,
                background:
                  i % 4 === 0 ? C.gold : "oklch(97% 0.01 70 / 0.35)",
                transformOrigin: "bottom",
                animation: `stepup-bar-bounce ${
                  0.7 + (i % 5) * 0.12
                }s ease-in-out infinite`,
                animationDelay: `${(i % 6) * 0.09}s`,
              }}
            />
          ))}
        </div>

        {/*
          Only the active line is ever in the tree. The prototype layered all
          three and toggled them with inline styles, which is what broke it —
          keying on the index instead remounts the one line and replays the
          fade, with nothing to stack.
        */}
        <div style={{ minHeight: 108 }} aria-live="off">
          <p
            key={index}
            className="stepup-rotating-line"
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(18px, 2.6vw, 22px)",
              fontWeight: 600,
              lineHeight: 1.35,
              margin: 0,
              animation: "stepup-line-in 0.5s ease-out",
            }}
          >
            {line.text}
            {line.author && (
              <>
                <br />
                <span
                  style={{
                    fontFamily: "inherit",
                    fontWeight: 500,
                    fontSize: 14,
                    color: C.onDarkSoft,
                  }}
                >
                  {line.author}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: 26,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: C.onDarkSoft }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
