import type { ReactNode } from "react";

/** Each tab's heading: a kicker, a big line, and whatever sits on the right. */
export function TabTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
      <div>
        <div className="sd-kicker">{kicker}</div>
        <h1 className="sd-h1">{title}</h1>
      </div>
      {children}
    </div>
  );
}

/** The green or red line a form shows after it's sent. */
export function ResultLine({ r }: { r: { ok: true; message: string } | { ok: false; error: string } | undefined }) {
  if (!r) return null;
  return r.ok ? (
    <div role="status" style={{ fontSize: 14, fontWeight: 600, color: "oklch(38% 0.1 150)" }}>
      {r.message}
    </div>
  ) : (
    <div role="alert" className="sd-err" style={{ fontSize: 14 }}>
      {r.error}
    </div>
  );
}
