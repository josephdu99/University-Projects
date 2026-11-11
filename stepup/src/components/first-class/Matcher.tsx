"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import {
  GOALS,
  MUSIC,
  WHEN,
  answersToParams,
  type Answers,
  type GoalId,
  type MusicId,
  type WhenId,
} from "@/lib/first-class";

const STEP_HINT = ["About 30 seconds", "About 20 seconds", "Last one"];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function optionStyle(on: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    textAlign: "left",
    padding: "20px 22px",
    minHeight: 96,
    borderRadius: 20,
    cursor: "pointer",
    border: `1.5px solid ${on ? C.heroBg : "oklch(86% 0.01 70)"}`,
    background: on ? C.heroBg : "oklch(99.5% 0.004 70)",
    color: on ? "#fff" : C.ink,
    transform: on ? "translateY(-2px)" : "none",
    boxShadow: on ? "0 14px 28px -16px oklch(50% 0.17 38 / 0.8)" : "none",
    transition: "all .18s",
    font: "inherit",
  };
}

/**
 * The three questions. Answers live in the URL on submit rather than in
 * localStorage, which is what the handoff's prototype used: a results page
 * that reads its inputs from the query string can be linked, reloaded and
 * rendered on the server against real classes.
 */
export function Matcher({ initial }: { initial: Answers }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<GoalId[]>(initial.goals);
  const [music, setMusic] = useState<MusicId | null>(initial.music);
  const [where, setWhere] = useState(initial.where);
  const [when, setWhen] = useState<WhenId[]>(initial.when);

  const canAdvance =
    step === 0
      ? goals.length > 0
      : step === 1
        ? music !== null
        : where.trim().length > 0 && when.length > 0;

  function next() {
    if (!canAdvance) return;
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    const params = answersToParams({ goals, music, where, when });
    router.push(`/start/results?${params.toString()}`);
  }

  const title =
    step === 0
      ? "What do you want from it?"
      : step === 1
        ? "What kind of music do you like?"
        : "Where and when suits you?";
  const sub =
    step === 0
      ? "Pick as many as you like."
      : step === 1
        ? "Your gut answer is the right one."
        : "We'll only show classes you can actually get to.";

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 760,
        width: "100%",
        margin: "0 auto",
        padding: "clamp(24px, 6vw, 64px) clamp(20px, 5vw, 40px) 48px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 6,
          }}
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`Question ${step + 1} of 3`}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 6,
                borderRadius: 99,
                background: i <= step ? C.heroBg : "oklch(88% 0.01 70)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 600,
            color: "oklch(48% 0.02 60)",
          }}
        >
          <span>Question {step + 1} of 3</span>
          <span>{STEP_HINT[step]}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: "clamp(30px, 5.5vw, 56px)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
        <p style={{ margin: 0, fontSize: 17, color: "oklch(42% 0.02 60)" }}>
          {sub}
        </p>
      </div>

      {step === 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 10,
          }}
        >
          {GOALS.map((g) => {
            const on = goals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setGoals(toggle(goals, g.id))}
                style={optionStyle(on)}
              >
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 19,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {g.label}
                </span>
                <span style={{ fontSize: 14, opacity: 0.8 }}>{g.hint}</span>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 10,
          }}
        >
          {MUSIC.map((m) => {
            const on = music === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => setMusic(m.id)}
                style={optionStyle(on)}
              >
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 19,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {m.label}
                </span>
                <span style={{ fontSize: 14, opacity: 0.8 }}>{m.hint}</span>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "oklch(48% 0.02 60)",
              }}
            >
              SUBURB OR CITY
            </span>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="e.g. Sydney"
              style={{
                height: 60,
                padding: "0 20px",
                borderRadius: 18,
                border: `1.5px solid ${C.ink}`,
                background: "oklch(99.5% 0.004 70)",
                fontSize: 18,
                fontWeight: 600,
                outline: "none",
                boxSizing: "border-box",
                font: "inherit",
                fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: 13, color: "oklch(48% 0.02 60)" }}>
              Online classes are shown wherever you are.
            </span>
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "oklch(48% 0.02 60)",
              }}
            >
              WHEN SUITS YOU · PICK ANY
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                gap: 10,
              }}
            >
              {WHEN.map((w) => {
                const on = when.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setWhen(toggle(when, w.id))}
                    style={optionStyle(on)}
                  >
                    <span
                      style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}
                    >
                      {w.label}
                    </span>
                    <span style={{ fontSize: 14, opacity: 0.8 }}>{w.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          paddingTop: 12,
          flexWrap: "wrap",
        }}
      >
        {step === 0 ? (
          <Link
            href="/"
            style={{
              fontWeight: 600,
              fontSize: 16,
              padding: "16px 8px",
              color: "oklch(42% 0.02 60)",
              textDecoration: "none",
            }}
          >
            ← Back
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 16,
              padding: "16px 8px",
              color: "oklch(42% 0.02 60)",
              font: "inherit",
            }}
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={!canAdvance}
          style={{
            border: 0,
            cursor: canAdvance ? "pointer" : "not-allowed",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 17,
            padding: "18px 30px",
            borderRadius: 999,
            background: canAdvance ? C.ink : "oklch(86% 0.01 70)",
            color: canAdvance ? C.heroCream : "oklch(55% 0.02 60)",
            transition: "background .2s",
          }}
        >
          {step < 2 ? "Next  →" : "Show my matches  →"}
        </button>
      </div>
    </div>
  );
}
