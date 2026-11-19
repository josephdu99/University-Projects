"use client";

import { useEffect } from "react";

/** Opens the print dialog once the sheet has rendered, and again on demand. */
export function PrintButton({ auto = false, label = "Print" }: { auto?: boolean; label?: string }) {
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, [auto]);
  return (
    <button type="button" className="sd-btn no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
