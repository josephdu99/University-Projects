import type { CSSProperties, ReactNode } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";

export const ORANGE = "oklch(63% 0.17 38)";
export const ORANGE_TEXT = "oklch(55% 0.17 38)";
export const ERR = "oklch(48% 0.17 30)";
export const MUTED = "oklch(45% 0.02 60)";
export const CARD = "oklch(99.5% 0.004 70)";

export const hintStyle: CSSProperties = { fontSize: 13, color: MUTED };
export const errStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: ERR };

/** A labelled field: the label text, the control, then a hint or an error. */
export function Field({
  label,
  hint,
  error,
  children,
  style,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, ...style }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      {children}
      {error ? (
        <span style={errStyle}>{error}</span>
      ) : hint ? (
        <span style={hintStyle}>{hint}</span>
      ) : null}
    </label>
  );
}

export function Grid({ min = 240, gap = 14, children }: { min?: number; gap?: number; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

export function Group({
  legend,
  children,
  size = 20,
}: {
  legend: string;
  children: ReactNode;
  size?: number;
}) {
  return (
    <fieldset
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minWidth: 0,
      }}
    >
      <legend
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: size,
          marginBottom: 12,
          padding: 0,
        }}
      >
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

export function chipStyle(on: boolean, accent = ORANGE): CSSProperties {
  return {
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 15,
    padding: "10px 16px",
    borderRadius: 999,
    border: `1.5px solid ${on ? accent : "oklch(80% 0.01 70)"}`,
    background: on ? accent : CARD,
    color: on ? "#fff" : C.ink,
    whiteSpace: "nowrap",
  };
}

/** A toggle chip: a real button with aria-pressed, as in the design. */
export function Chip({
  on,
  onClick,
  children,
  accent,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <button
      type="button"
      className="su-chip"
      aria-pressed={on}
      onClick={onClick}
      style={chipStyle(on, accent)}
    >
      {children}
    </button>
  );
}

export function Eyebrow({ children, color = "oklch(50% 0.17 38)" }: { children: ReactNode; color?: string }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", color }}>{children}</div>
  );
}

export function PageTitle({ children, size = "clamp(38px, 5.5vw, 60px)" }: { children: ReactNode; size?: string }) {
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: "-0.045em",
        textWrap: "balance",
      }}
    >
      {children}
    </h1>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 18, color: "oklch(40% 0.02 60)", maxWidth: "48ch" }}>
      {children}
    </p>
  );
}

/** The ← Back / Still needed / Next row under each step. */
export function StepNav({
  showBack,
  onBack,
  missing,
  nextLabel,
  blocked,
  pending,
  primary,
}: {
  showBack: boolean;
  onBack: () => void;
  missing: string;
  nextLabel: string;
  blocked: boolean;
  pending?: boolean;
  /** The last step's button is orange; earlier ones are ink. */
  primary: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        paddingTop: 8,
        borderTop: "1px solid oklch(86% 0.01 70)",
      }}
    >
      <button
        type="button"
        className="su-btn"
        onClick={onBack}
        style={{
          border: 0,
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 16,
          padding: "14px 6px",
          color: "oklch(40% 0.02 60)",
          visibility: showBack ? "visible" : "hidden",
        }}
      >
        ← Back
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <span role="status" style={missing ? errStyle : hintStyle}>
          {missing}
        </span>
        <button
          type="submit"
          className="su-btn"
          disabled={pending}
          style={{
            border: 0,
            cursor: pending ? "progress" : "pointer",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 17,
            padding: "16px 28px",
            borderRadius: 999,
            background: blocked ? "oklch(86% 0.01 70)" : primary ? ORANGE : C.ink,
            color: blocked ? "oklch(40% 0.02 60)" : "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {pending ? "Saving…" : nextLabel}
        </button>
      </div>
    </div>
  );
}

export function DoneTick() {
  return (
    <div
      aria-hidden
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: ORANGE,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 30,
        fontWeight: 700,
      }}
    >
      ✓
    </div>
  );
}

export function FactCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 22,
        background: CARD,
        border: "1px solid oklch(88% 0.01 70)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "oklch(50% 0.17 38)" }}>
        {label}
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19 }}>{value}</div>
    </div>
  );
}
