"use client";

import { useState, useSyncExternalStore } from "react";
import { C, DISPLAY } from "@/lib/marketing-theme";

export type CheckoutTerms = {
  studioName: string;
  version: number;
  /** "waiver, code of conduct and cancellation policy" */
  label: string;
  sections: { title: string; body: string }[];
  pdfUrl: string | null;
};

export type CheckoutNeeds = {
  style: string;
  role: boolean;
  /** Which side the class is short of tonight. */
  needed: "LEAD" | "FOLLOW" | null;
  terms: CheckoutTerms | null;
  askMobile: boolean;
  /** Says Either if the class has partner work but no role limits. */
  roleRule: string | null;
};

const ROLES_KEY = "stepup-v6-roles";
const ROLES = [
  { id: "LEAD", label: "Lead", hint: "Leads" },
  { id: "FOLLOW", label: "Follow", hint: "Follows" },
  { id: "EITHER", label: "Either", hint: "Wherever needed" },
] as const;

function readRoles(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(ROLES_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

const field: React.CSSProperties = {
  height: 56,
  padding: "0 18px",
  borderRadius: 16,
  border: "1.5px solid oklch(80% 0.01 70)",
  background: "oklch(99.5% 0.004 70)",
  fontSize: 17,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  width: "100%",
};

/**
 * What a booking needs beyond a seat, shown only when it's needed: Lead,
 * Follow or Either for a partner class (remembered per style), the studio's
 * terms once per version, a mobile the studio can reach, and an optional
 * note for the teacher. The server checks all of it again.
 */
export function CheckoutExtras({ needs }: { needs: CheckoutNeeds }) {
  const stored = useSyncExternalStore(
    subscribe,
    () => readRoles()[needs.style] ?? "",
    () => "",
  );
  const [picked, setPicked] = useState<string | null>(null);
  const role = picked ?? stored;
  const remembered = picked === null && Boolean(stored);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {needs.role && (
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <legend style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, padding: 0, marginBottom: 6 }}>Lead or follow?</legend>
          <div style={{ fontSize: 14, color: C.inkSoft }}>
            Partners rotate every song, so you don&apos;t need to bring one. Not sure? Pick Either and we&apos;ll put you where you&apos;re needed.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {ROLES.map((r) => {
              const on = role === r.id;
              return (
                <label
                  key={r.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    padding: "14px 14px",
                    borderRadius: 16,
                    cursor: "pointer",
                    border: `1.5px solid ${on ? C.heroBg : "oklch(80% 0.01 70)"}`,
                    background: on ? C.heroBg : "oklch(99.5% 0.004 70)",
                    color: on ? "#fff" : C.ink,
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    required
                    checked={on}
                    onChange={() => {
                      setPicked(r.id);
                      try {
                        window.localStorage.setItem(ROLES_KEY, JSON.stringify({ ...readRoles(), [needs.style]: r.id }));
                      } catch {
                        // Private mode: the choice just isn't remembered.
                      }
                    }}
                    style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>{r.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: needs.needed === r.id ? 700 : 500, opacity: 0.9 }}>
                    {needs.needed === r.id ? "Needed tonight" : r.hint}
                  </span>
                </label>
              );
            })}
          </div>
          {remembered && (
            <div style={{ fontSize: 13, color: C.inkSoft }}>{`From your last ${needs.style.toLowerCase()} class. We'll remember it for the next one.`}</div>
          )}
        </fieldset>
      )}

      {needs.askMobile && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Mobile</span>
          <input name="mobile" type="tel" required autoComplete="tel" inputMode="tel" placeholder="0412 345 678" style={field} />
          <span style={{ fontSize: 13, color: C.inkSoft }}>So the studio can reach you if the class moves or is cancelled.</span>
        </label>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Anything your teacher should know? (optional)</span>
        <input name="note" maxLength={280} placeholder="First time ever, coming with a friend" style={field} />
        <span style={{ fontSize: 13, color: C.inkSoft }}>Shown on the class list. Please don&apos;t put health details here.</span>
      </label>

      {needs.terms && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 15 }}>
            <input type="checkbox" name="acceptTerms" required style={{ width: 20, height: 20, marginTop: 2, accentColor: C.heroBg, flexShrink: 0 }} />
            <span>
              I accept <strong>{`${needs.terms.studioName}'s terms`}</strong>
              {`: ${needs.terms.label} (version ${needs.terms.version}).`}
            </span>
          </label>
          <details style={{ marginLeft: 32 }}>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{`Read ${needs.terms.studioName}'s terms`}</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 14, color: "oklch(35% 0.02 60)" }}>
              {needs.terms.pdfUrl ? (
                <a href={needs.terms.pdfUrl} target="_blank" rel="noopener" style={{ color: C.ink, fontWeight: 600 }}>
                  Open the terms (PDF)
                </a>
              ) : (
                needs.terms.sections.map((s) => (
                  <span key={s.title}>
                    <strong>{s.title}.</strong> {s.body}
                  </span>
                ))
              )}
              <span>{`You only accept this once for ${needs.terms.studioName}, and again only if ${needs.terms.studioName} changes its terms.`}</span>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
