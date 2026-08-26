"use client";

import { useRef } from "react";
import { C } from "@/lib/marketing-theme";

/**
 * The pill-track switch used across the redesigned pages.
 *
 * A real radiogroup rather than a row of divs: screen readers announce "2 of
 * 3, selected", and the arrow keys move between options with a roving
 * tabindex, which is what a keyboard user expects from a group of radios.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;

    event.preventDefault();
    const index = options.findIndex((o) => o.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    // Focus follows selection, as it does in a native radiogroup.
    ref.current
      ?.querySelectorAll("button")
      [options.indexOf(next)]?.focus();
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        flex: "none",
        display: "flex",
        gap: 3,
        padding: 4,
        borderRadius: 999,
        background: "oklch(96.8% 0.01 72)",
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            style={{
              flex: "none",
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              padding: "9px 17px",
              borderRadius: 999,
              background: on ? C.card : "transparent",
              boxShadow: on ? "0 1px 3px oklch(22% 0.02 60 / 0.1)" : "none",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              color: on ? C.ink : "oklch(50% 0.02 60)",
              transition: "background 0.18s ease, color 0.18s ease",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
