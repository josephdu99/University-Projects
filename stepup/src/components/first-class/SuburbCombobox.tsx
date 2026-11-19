"use client";

import { useEffect, useId, useRef, useState } from "react";
import { C } from "@/lib/marketing-theme";
import { findSuburb, searchSuburbs } from "@/lib/suburbs";

const HIGHLIGHT = "oklch(94% 0.045 65)";

/**
 * Suburb search for question 3: an accessible combobox over the Sydney
 * suburbs list, following the ARIA combobox pattern with a listbox popup.
 *
 * `value` is the suburb actually picked, or "". What is typed is kept apart
 * from it: typing half a name un-picks the suburb (so the question stops
 * counting as answered) until a suburb is chosen from the list or the text
 * matches one exactly. On blur the box goes back to the picked suburb, or
 * keeps what was typed when nothing has been picked.
 */
export function SuburbCombobox({
  value,
  studioSuburbs,
  onPick,
  variant = "match",
  label,
  hint,
  invalid = false,
}: {
  value: string;
  studioSuburbs: string[];
  onPick: (name: string) => void;
  /** "form" sizes it like the sign-up forms' other fields. */
  variant?: "match" | "form";
  label?: string;
  /** A line under the box, tied to it with aria-describedby. */
  hint?: string;
  invalid?: boolean;
}) {
  const form = variant === "form";
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const hintId = `${uid}-hint`;

  const inputRef = useRef<HTMLInputElement>(null);
  // null while not editing, so the box simply shows the picked suburb.
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  const text = draft ?? value;
  const matches = searchSuburbs(text, studioSuburbs);
  const active = Math.min(hi, Math.max(matches.length - 1, 0));
  const activeId = open && matches.length > 0 ? optionId(active) : undefined;

  // Keep the highlighted option visible while arrowing through a long list.
  // A DOM effect only, it sets no state.
  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeId]);

  function pick(name: string) {
    onPick(name);
    setDraft(null);
    setOpen(false);
    setHi(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHi(0);
      } else {
        setHi(Math.min(active + 1, matches.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        pick(matches[active].name);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: form ? 6 : 8, minWidth: 0 }}>
      <label
        htmlFor={inputId}
        style={
          form
            ? { fontSize: 13, fontWeight: 700 }
            : {
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "oklch(45% 0.02 60)",
              }
        }
      >
        {label ?? "SUBURB OR POSTCODE"}
      </label>
      <div style={{ position: "relative" }}>
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 20 20"
          style={{
            position: "absolute",
            left: form ? 16 : 18,
            top: form ? 17 : 20,
            pointerEvents: "none",
          }}
        >
          <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="oklch(45% 0.02 60)" strokeWidth="2" />
          <path d="M13 13l5 5" stroke="oklch(45% 0.02 60)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={activeId}
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          spellCheck={false}
          value={text}
          placeholder={form ? "Start typing a suburb" : "Start typing, e.g. Newtown or 2042"}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            setOpen(true);
            setHi(0);
            // An exact name is as good as a pick; anything else un-picks.
            onPick(findSuburb(v)?.name ?? "");
          }}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            if (value) setDraft(null);
          }}
          onKeyDown={onKeyDown}
          style={{
            width: "100%",
            height: form ? 54 : 60,
            padding: form ? "0 52px 0 44px" : "0 56px 0 48px",
            borderRadius: form ? 16 : 18,
            border: `1.5px solid ${
              open ? C.heroBg : invalid ? "oklch(48% 0.17 30)" : form ? "oklch(80% 0.01 70)" : C.ink
            }`,
            background: "oklch(99.5% 0.004 70)",
            fontSize: form ? 16 : 18,
            fontWeight: form ? 500 : 600,
            fontFamily: "inherit",
            color: C.ink,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {text.length > 0 && (
          <button
            type="button"
            aria-label="Clear suburb"
            // mousedown, not click, so the input keeps focus and the list
            // stays open for the next search.
            onMouseDown={(e) => {
              e.preventDefault();
              setDraft("");
              setOpen(true);
              setHi(0);
              onPick("");
              inputRef.current?.focus();
            }}
            style={{
              position: "absolute",
              right: form ? 10 : 12,
              top: form ? 10 : 12,
              width: form ? 34 : 36,
              height: form ? 34 : 36,
              border: 0,
              borderRadius: "50%",
              background: "oklch(93% 0.01 70)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: "oklch(35% 0.02 60)",
            }}
          >
            ×
          </button>
        )}

        {open && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: form ? 60 : 66,
              zIndex: 20,
              borderRadius: 18,
              background: "oklch(99.5% 0.004 70)",
              border: `1.5px solid ${C.ink}`,
              boxShadow: "0 24px 40px -20px oklch(22% 0.02 60 / 0.45)",
              overflow: "hidden",
            }}
          >
            <ul
              id={listId}
              role="listbox"
              aria-label="Sydney suburbs"
              style={{
                listStyle: "none",
                margin: 0,
                padding: matches.length ? 6 : 0,
                maxHeight: 304,
                overflowY: "auto",
              }}
            >
              {matches.map((s, i) => (
                <li
                  key={s.name}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  // mousedown with preventDefault: picking must not blur the
                  // input first, or the list would close before the pick.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s.name);
                  }}
                  onMouseEnter={() => setHi(i)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: i === active ? HIGHLIGHT : "transparent",
                  }}
                >
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                    <span style={{ fontSize: 13, color: "oklch(45% 0.02 60)" }}>
                      NSW {s.postcode} · {s.area}
                    </span>
                  </span>
                  {studioSuburbs.includes(s.name) && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: HIGHLIGHT,
                        color: "oklch(45% 0.15 38)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Studio here
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {matches.length === 0 && (
              <div
                role="status"
                style={{ padding: "14px 18px", fontSize: 15, color: "oklch(42% 0.02 60)" }}
              >
                No Sydney suburbs match &ldquo;{text.trim()}&rdquo;. Try a nearby
                suburb or postcode.
              </div>
            )}
          </div>
        )}
      </div>
      {hint && (
        <span
          id={hintId}
          style={{
            fontSize: 13,
            fontWeight: invalid ? 600 : 400,
            color: invalid ? "oklch(48% 0.17 30)" : "oklch(45% 0.02 60)",
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
