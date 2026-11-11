"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { C, DISPLAY } from "@/lib/marketing-theme";

export type NextOption = {
  id: string;
  title: string;
  meta: string;
  src: string;
  sameStyle: boolean;
};

type BranchId = "loved" | "ok" | "not";

const BRANCHES: {
  id: BranchId;
  label: string;
  note: string;
  reply: string;
  /** Which of the offered classes this answer leads with. */
  prefer: "same" | "different";
}[] = [
  {
    id: "loved",
    label: "Loved it",
    note: "Go again, same style.",
    reply:
      "Good. The next one in the same style is where it starts to feel like yours.",
    prefer: "same",
  },
  {
    id: "ok",
    label: "It was ok",
    note: "One more go, or a different room.",
    reply:
      "Second classes are usually the ones that click, because you already know where to stand. Either of these works.",
    prefer: "same",
  },
  {
    id: "not",
    label: "Not for me",
    note: "A different style, not just a different night.",
    reply:
      "Fair enough. One style saying nothing to you says very little about the rest, so here is something genuinely different.",
    prefer: "different",
  },
];

/**
 * Step 8: what to do next, steered by how the class went.
 *
 * The handoff sent this as a text message on the night and, on "not for me",
 * refunded the class as credit. There is no messaging and no credit ledger in
 * the app, so this is a page the dancer opens, and the three answers steer
 * which real upcoming class is offered first rather than triggering a refund.
 *
 * The answer is not stored anywhere. Nothing here tells the dancer their
 * feedback reached the studio, because it would not be true.
 */
export function AfterClass({
  classTitle,
  options,
}: {
  classTitle: string;
  options: NextOption[];
}) {
  const [answer, setAnswer] = useState<BranchId | null>(null);
  const branch = BRANCHES.find((b) => b.id === answer) ?? null;

  const ordered = branch
    ? [...options].sort((a, b) => {
        const want = branch.prefer === "same";
        return Number(b.sameStyle === want) - Number(a.sameStyle === want);
      })
    : options;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
        gap: "clamp(28px, 6vw, 72px)",
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: "clamp(34px, 6vw, 68px)",
            lineHeight: 0.95,
            letterSpacing: "-0.045em",
            textWrap: "balance",
          }}
        >
          How was it?
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 18,
            color: "oklch(40% 0.02 60)",
            maxWidth: "40ch",
          }}
        >
          One question about {classTitle}. Whichever way you answer, there is
          somewhere to go next.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTop: `1.5px solid ${C.ink}`,
          }}
        >
          {BRANCHES.map((b) => {
            const on = b.id === answer;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                onClick={() => setAnswer(b.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  textAlign: "left",
                  padding: "18px 16px",
                  border: 0,
                  borderBottom: "1px solid oklch(86% 0.01 70)",
                  borderLeft: `4px solid ${on ? C.heroBg : "transparent"}`,
                  background: on ? "oklch(99.5% 0.004 70)" : "transparent",
                  cursor: "pointer",
                  transition: "all .15s",
                  font: "inherit",
                  color: C.ink,
                }}
              >
                <span
                  style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}
                >
                  {b.label}
                </span>
                <span style={{ fontSize: 15, color: "oklch(42% 0.02 60)" }}>
                  {b.note}
                </span>
              </button>
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "oklch(50% 0.02 60)" }}>
          Your answer stays on this page, it just decides what we show you next.
        </p>
      </div>

      <div
        style={{
          borderRadius: 32,
          background: "oklch(99.5% 0.004 70)",
          border: "1px solid oklch(86% 0.01 70)",
          padding: "clamp(18px, 3vw, 26px)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minHeight: 320,
        }}
      >
        {!branch ? (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              fontSize: 16,
              color: C.inkSoft,
              maxWidth: "28ch",
            }}
          >
            Pick an answer and we&apos;ll put the right class in front of you.
          </div>
        ) : (
          <>
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: "18px 18px 6px 18px",
                background: C.heroBg,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {branch.label}
            </div>
            <div
              style={{
                maxWidth: "92%",
                padding: "10px 14px",
                borderRadius: "18px 18px 18px 6px",
                background: "oklch(94% 0.01 70)",
                fontSize: 15,
                lineHeight: 1.4,
                textWrap: "pretty",
              }}
            >
              {branch.reply}
            </div>

            {ordered.length === 0 ? (
              <div style={{ fontSize: 15, color: C.inkSoft, padding: "8px 2px" }}>
                Nothing else is on the schedule just yet.{" "}
                <Link
                  href="/discover"
                  style={{ color: "oklch(55% 0.17 38)", fontWeight: 700 }}
                >
                  Browse all classes
                </Link>
                .
              </div>
            ) : (
              ordered.map((o) => (
                <Link
                  key={o.id}
                  href={`/first-class/${o.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px minmax(0,1fr)",
                    gap: 12,
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 18,
                    border: "1px solid oklch(88% 0.01 70)",
                    background: "#fff",
                    textDecoration: "none",
                    color: C.ink,
                  }}
                >
                  <Image
                    src={o.src}
                    alt=""
                    width={112}
                    height={112}
                    sizes="56px"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1.25,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: DISPLAY,
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        {o.title}
                      </span>
                      <span style={{ fontSize: 12, color: C.inkSoft }}>
                        {o.meta}
                      </span>
                    </span>
                    <span
                      style={{
                        alignSelf: "flex-start",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "7px 12px",
                        borderRadius: 999,
                        background: o.sameStyle ? C.heroBg : "oklch(94% 0.01 70)",
                        color: o.sameStyle ? "#fff" : C.ink,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.sameStyle ? "Book the next one" : "Try this instead"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
