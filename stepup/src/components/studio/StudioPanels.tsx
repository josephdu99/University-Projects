"use client";

import { createContext, useCallback, useContext, useState, type CSSProperties, type ReactNode } from "react";

export type Panel = "class" | "invite" | "import";

type Ctx = {
  open: Panel | null;
  show: (p: Panel) => void;
  close: () => void;
  toast: string | null;
  setToast: (t: string | null) => void;
};

const PanelContext = createContext<Ctx | null>(null);

export const PANEL_ID: Record<Panel, string> = {
  class: "create-class",
  invite: "invite-teachers",
  import: "import-schedule",
};

/**
 * Which in-page panel is open on the studio dashboard, and the confirmation
 * banner. The dashboard itself is server-rendered; this context lets the
 * scattered buttons (header, empty state, team list) open the same panels.
 */
export function StudioPanelProvider({
  initial,
  children,
}: {
  initial: Panel | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<Panel | null>(initial);
  const [toast, setToast] = useState<string | null>(null);

  const show = useCallback((p: Panel) => {
    setOpen(p);
    setToast(null);
    // After the panel renders, bring it into view.
    window.setTimeout(() => {
      const el = document.getElementById(PANEL_ID[p]);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
    }, 40);
  }, []);

  const close = useCallback(() => setOpen(null), []);

  return (
    <PanelContext.Provider value={{ open, show, close, toast, setToast }}>{children}</PanelContext.Provider>
  );
}

export function useStudioPanels(): Ctx {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("useStudioPanels outside StudioPanelProvider");
  return ctx;
}

export function OpenPanelButton({
  panel,
  children,
  style,
  className,
  hideWhenOpen = false,
}: {
  panel: Panel;
  children: ReactNode;
  style: CSSProperties;
  className?: string;
  /** For a button that sits where its own panel opens. */
  hideWhenOpen?: boolean;
}) {
  const { open, show } = useStudioPanels();
  if (hideWhenOpen && open === panel) return null;
  return (
    <button
      type="button"
      className={className ? `su-btn ${className}` : "su-btn"}
      aria-expanded={open === panel}
      aria-controls={PANEL_ID[panel]}
      onClick={() => show(panel)}
      style={{ cursor: "pointer", fontFamily: "inherit", ...style }}
    >
      {children}
    </button>
  );
}

/** The green confirmation line under the studio header. */
export function StudioBanner() {
  const { toast, setToast } = useStudioPanels();
  if (!toast) return null;
  return (
    <div
      role="status"
      className="su-panel-in"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 20px",
        marginBottom: 20,
        borderRadius: 18,
        background: "oklch(93% 0.06 150)",
        color: "oklch(30% 0.08 150)",
        fontWeight: 600,
      }}
    >
      <span>{toast}</span>
      <button
        type="button"
        className="su-btn"
        onClick={() => setToast(null)}
        aria-label="Dismiss"
        style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "inherit" }}
      >
        ×
      </button>
    </div>
  );
}
