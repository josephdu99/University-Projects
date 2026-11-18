"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import {
  GOALS,
  MUSIC,
  WHEN,
  answerChips,
  opennessOf,
  outOfReach,
  questionsDone,
  rankClasses,
  type Answers,
} from "@/lib/first-class";
import { findSuburb } from "@/lib/suburbs";
import { Wordmark } from "./FunnelChrome";
import { MatchCard, MatchRow } from "./MatchCard";
import { SuburbCombobox } from "./SuburbCombobox";
import { useStoredAnswers } from "./useStoredAnswers";
import type { LiveCandidate, MatchCandidate } from "./match-types";

const WIDTH = 1120;
const PAD = "clamp(20px, 5vw, 48px)";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function cardStyle(on: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    textAlign: "left",
    padding: "18px 20px",
    minHeight: 88,
    borderRadius: 20,
    cursor: "pointer",
    fontFamily: "inherit",
    border: `1.5px solid ${on ? C.heroBg : "oklch(86% 0.01 70)"}`,
    background: on ? C.heroBg : "oklch(99.5% 0.004 70)",
    color: on ? "#fff" : C.ink,
    transform: on ? "translateY(-2px)" : "none",
    boxShadow: on ? "0 14px 28px -16px oklch(50% 0.17 38 / 0.8)" : "none",
    transition: "all .18s",
  };
}

function pillStyle(on: boolean): React.CSSProperties {
  return {
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 16,
    padding: "0 20px",
    height: 60,
    borderRadius: 999,
    border: `1.5px solid ${on ? C.heroBg : "oklch(86% 0.01 70)"}`,
    background: on ? C.heroBg : "oklch(99.5% 0.004 70)",
    color: on ? "#fff" : C.ink,
    whiteSpace: "nowrap",
    transition: "all .18s",
  };
}

const COUNT_WORD = ["", "one", "two", "three"];

function resultsTitle(n: number, allAnswered: boolean): string {
  if (n === 0) return "Nothing to show yet.";
  if (allAnswered) {
    return n === 1
      ? "One class picked for you."
      : `${COUNT_WORD[n][0].toUpperCase()}${COUNT_WORD[n].slice(1)} classes picked for you.`;
  }
  return n === 1 ? "Your top match so far." : `Your top ${COUNT_WORD[n]} so far.`;
}

function Question({
  n,
  title,
  sub,
  children,
}: {
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`q${n}-title`}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: C.ink,
            color: C.heroCream,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "translateY(-4px)",
          }}
        >
          {n}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2
            id={`q${n}-title`}
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(24px, 3.2vw, 34px)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </h2>
          <span style={{ fontSize: 15, color: "oklch(42% 0.02 60)" }}>{sub}</span>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * The matcher: three questions and the matches, on one page.
 *
 * There is no submit. Results sit directly under the questions and re-rank
 * on every change, so the page is useful from the first click and the cost
 * of an answer is visible the moment it is given. Answers live in
 * localStorage, through `useStoredAnswers`, so they survive a trip to a
 * class page and back.
 */
export function MatchPage({
  candidates,
  studioSuburbs,
  fromUrl,
}: {
  candidates: MatchCandidate[];
  studioSuburbs: string[];
  fromUrl: Answers | null;
}) {
  const [answers, update] = useStoredAnswers(fromUrl);
  const [showMore, setShowMore] = useState(false);

  const live: LiveCandidate[] = useMemo(
    () => candidates.map((c) => ({ ...c, startTime: new Date(c.startTime) })),
    [candidates],
  );
  const ranked = useMemo(() => rankClasses(live, answers), [live, answers]);

  const done = questionsDone(answers);
  const answered = done.filter(Boolean).length;
  const chips = answerChips(answers);
  const picked = findSuburb(answers.where);
  const hiddenElsewhere = picked
    ? live.filter((c) => opennessOf(c.level) && outOfReach(c, answers.where)).length
    : 0;

  const top = ranked.slice(0, 3);
  const more = ranked.slice(3, 6);

  return (
    <>
      <div
        style={{
          maxWidth: WIDTH,
          width: "100%",
          margin: "0 auto",
          padding: `20px ${PAD} 0`,
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" aria-label="StepUp home" style={{ textDecoration: "none" }}>
          <Wordmark size={20} />
        </Link>
        <Link
          href="/"
          className="stepup-text-link"
          style={{ fontWeight: 600, fontSize: 14, color: "oklch(45% 0.02 60)", textDecoration: "none" }}
        >
          Exit
        </Link>
      </div>

      {/* ── QUESTIONS ─────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: WIDTH,
          width: "100%",
          margin: "0 auto",
          padding: `clamp(28px, 5vw, 56px) ${PAD} 0`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(36px, 5vw, 52px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: "oklch(55% 0.17 38)",
            }}
          >
            BEGINNER-FRIENDLY CLASSES ONLY
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(38px, 6vw, 68px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              textWrap: "balance",
            }}
          >
            Find your first class.
          </h1>
          <p style={{ margin: 0, fontSize: 18, color: "oklch(42% 0.02 60)", maxWidth: "46ch" }}>
            Three quick questions. Your matches appear below and update as you
            answer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
            <div
              role="progressbar"
              aria-label="Questions answered"
              aria-valuenow={answered}
              aria-valuemin={0}
              aria-valuemax={3}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6 }}
            >
              {done.map((d, i) => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    borderRadius: 99,
                    background: d ? C.heroBg : "oklch(88% 0.01 70)",
                    transition: "background .3s",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "oklch(45% 0.02 60)" }}>
              {answered} of 3 answered
            </div>
          </div>
        </div>

        <Question n={1} title="What do you want from it?" sub="Pick as many as you like.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
              gap: 10,
            }}
          >
            {GOALS.map((g) => {
              const on = answers.goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ goals: toggle(answers.goals, g.id) })}
                  style={cardStyle(on)}
                >
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
                    {g.label}
                  </span>
                  <span style={{ fontSize: 14, opacity: 0.85 }}>{g.hint}</span>
                </button>
              );
            })}
          </div>
        </Question>

        <Question n={2} title="What kind of music do you like?" sub="Your gut answer is the right one.">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
              gap: 10,
            }}
          >
            {MUSIC.map((m) => {
              const on = answers.music === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  // Clicking the chosen one again clears it.
                  onClick={() => update({ music: on ? null : m.id })}
                  style={cardStyle(on)}
                >
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize: 14, opacity: 0.85 }}>{m.hint}</span>
                </button>
              );
            })}
          </div>
        </Question>

        <Question
          n={3}
          title="Where and when suits you?"
          sub="We'll only show classes you can actually get to."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            <SuburbCombobox
              value={answers.where}
              studioSuburbs={studioSuburbs}
              onPick={(name) => {
                if (name !== answers.where) update({ where: name });
              }}
            />
            <div
              role="group"
              aria-labelledby="when-label"
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <span
                id="when-label"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "oklch(45% 0.02 60)",
                }}
              >
                WHEN SUITS YOU · PICK ANY
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {WHEN.map((w) => {
                  const on = answers.when.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ when: toggle(answers.when, w.id) })}
                      style={pillStyle(on)}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Question>
      </div>

      {/* ── RESULTS ───────────────────────────────────────────────────── */}
      <section
        aria-labelledby="results-title"
        style={{
          maxWidth: WIDTH,
          width: "100%",
          margin: "clamp(48px, 7vw, 80px) auto 0",
          padding: `clamp(32px, 5vw, 48px) ${PAD} 96px`,
          boxSizing: "border-box",
          borderTop: `1.5px solid ${C.ink}`,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2
            id="results-title"
            // Announced as it changes, so the effect of an answer is heard as
            // well as seen.
            aria-live="polite"
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(30px, 5vw, 56px)",
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              textWrap: "balance",
            }}
          >
            {resultsTitle(top.length, answered === 3)}
          </h2>
          {chips.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: C.inkSoft, marginRight: 4 }}>Based on</span>
              {chips.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "oklch(99.5% 0.004 70)",
                    border: "1px solid oklch(86% 0.01 70)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, color: C.inkSoft }}>
              No answers yet, so these are simply the soonest beginner-friendly
              classes.
            </p>
          )}
          {hiddenElsewhere > 0 && (
            <p style={{ margin: 0, fontSize: 14, color: C.inkSoft }}>
              {hiddenElsewhere} in-person {hiddenElsewhere === 1 ? "class" : "classes"} outside
              Sydney {hiddenElsewhere === 1 ? "is" : "are"} hidden while a Sydney suburb is picked.
            </p>
          )}
        </div>

        {top.length === 0 ? (
          <div
            style={{
              padding: "clamp(24px, 5vw, 40px)",
              borderRadius: 28,
              background: "oklch(99.5% 0.004 70)",
              border: `1px solid ${C.border}`,
              fontSize: 17,
              color: C.inkSoft,
            }}
          >
            No beginner-friendly classes are coming up that you could get to
            from there yet.{" "}
            <Link href="/discover" style={{ color: "oklch(50% 0.17 38)", fontWeight: 700 }}>
              Browse every class
            </Link>
            .
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: 20,
            }}
          >
            {top.map((c, i) => (
              <MatchCard key={c.id} c={c} rank={i + 1} />
            ))}
          </div>
        )}

        {showMore && more.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", borderTop: `1.5px solid ${C.ink}` }}>
            {more.map((c) => (
              <MatchRow key={c.id} c={c} />
            ))}
          </div>
        )}

        {top.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            {!showMore && more.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                style={{
                  border: `1.5px solid ${C.ink}`,
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "16px 26px",
                  borderRadius: 999,
                  color: C.ink,
                }}
              >
                See {more.length} more beginner-friendly{" "}
                {more.length === 1 ? "class" : "classes"}
              </button>
            ) : (
              <Link
                href="/discover"
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "oklch(50% 0.17 38)",
                  textDecoration: "none",
                }}
              >
                Browse every class →
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
