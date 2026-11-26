"use client";

import { useEffect, useId, useRef, useState } from "react";
import { C } from "@/lib/marketing-theme";
import { findSuburb, searchSuburbs } from "@/lib/suburbs";
import { SuburbOptions } from "./SuburbCombobox";

/**
 * Several suburbs for question 3, added one at a time like recipients in an
 * email: type, pick from the list (or press Enter or a comma), and the suburb
 * becomes a chip in the box. × on a chip, or Backspace in an empty box,
 * takes one out. Only real suburbs from the list become chips.
 */
export function SuburbChips({
  values,
  studioSuburbs,
  max,
  onChange,
}: {
  values: string[];
  studioSuburbs: string[];
  max: number;
  onChange: (next: string[]) => void;
}) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const hintId = `${uid}-hint`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  const full = values.length >= max;
  const matches = searchSuburbs(text, studioSuburbs).filter((s) => !values.includes(s.name));
  const active = Math.min(hi, Math.max(matches.length - 1, 0));
  const showList = open && !full;
  const activeId = showList && matches.length > 0 ? optionId(active) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function add(name: string) {
    if (!values.includes(name) && values.length < max) onChange([...values, name]);
    setText("");
    setHi(0);
  }

  function remove(name: string) {
    onChange(values.filter((v) => v !== name));
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHi(0);
      } else setHi(Math.min(active + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi(Math.max(active - 1, 0));
    } else if (e.key === "Enter" || e.key === ",") {
      const exact = findSuburb(text);
      const pick = showList && matches[active] ? matches[active].name : exact?.name;
      if (pick || e.key === ",") e.preventDefault();
      if (pick) add(pick);
    } else if (e.key === "Backspace" && text === "" && values.length) {
      e.preventDefault();
      onChange(values.slice(0, -1));
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(45% 0.02 60)" }}
      >
        SUBURBS OR POSTCODES · ADD ANY
      </label>
      <div style={{ position: "relative" }}>
        <div
          // A click anywhere in the box, between chips, goes to the input.
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            minHeight: 60,
            padding: "8px 12px 8px 48px",
            borderRadius: 18,
            border: `1.5px solid ${open ? C.heroBg : C.ink}`,
            background: "oklch(99.5% 0.004 70)",
            boxSizing: "border-box",
            cursor: "text",
            position: "relative",
          }}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", left: 18, top: 19, pointerEvents: "none" }}>
            <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="oklch(45% 0.02 60)" strokeWidth="2" />
            <path d="M13 13l5 5" stroke="oklch(45% 0.02 60)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {values.length > 0 && (
            <ul aria-label="Suburbs added" style={{ display: "contents", listStyle: "none", margin: 0, padding: 0 }}>
              {values.map((name) => (
                <li
                  key={name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 6px 6px 14px",
                    borderRadius: 999,
                    background: C.heroBg,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => remove(name)}
                    style={{
                      width: 26,
                      height: 26,
                      border: 0,
                      borderRadius: "50%",
                      background: "oklch(100% 0 0 / 0.22)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showList}
            aria-activedescendant={activeId}
            aria-describedby={hintId}
            autoComplete="off"
            spellCheck={false}
            disabled={full}
            value={text}
            placeholder={full ? "" : values.length ? "Add another suburb" : "Start typing, e.g. Newtown or 2042"}
            onChange={(e) => {
              const v = e.target.value;
              // A comma typed or pasted at the end adds what came before it.
              if (v.endsWith(",")) {
                const exact = findSuburb(v.slice(0, -1));
                if (exact) {
                  add(exact.name);
                  return;
                }
              }
              setText(v);
              setOpen(true);
              setHi(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              const exact = findSuburb(text);
              if (exact) add(exact.name);
            }}
            onKeyDown={onKeyDown}
            style={{
              flex: "1 1 160px",
              minWidth: 0,
              height: 42,
              border: 0,
              outline: "none",
              background: "transparent",
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "inherit",
              color: C.ink,
              padding: 0,
            }}
          />
        </div>
        {showList && (
          <SuburbOptions
            listId={listId}
            optionId={optionId}
            matches={matches}
            active={active}
            studioSuburbs={studioSuburbs}
            text={text}
            top="calc(100% + 6px)"
            onPick={(name) => {
              add(name);
              inputRef.current?.focus();
            }}
            onHover={setHi}
          />
        )}
      </div>
      <span id={hintId} style={{ fontSize: 13, color: "oklch(45% 0.02 60)" }}>
        {full
          ? `That's ${max}, the most it takes. Remove one to add another.`
          : "Home, work, anywhere you'd happily go. Press Enter or a comma after each."}
      </span>
    </div>
  );
}
