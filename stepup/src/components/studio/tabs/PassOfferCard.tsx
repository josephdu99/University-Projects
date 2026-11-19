"use client";

import { useActionState, useState } from "react";
import { archivePassAction, savePassAction, sendPassOfferAction } from "@/lib/actions/studio-admin-actions";
import { money } from "@/lib/statement";
import { ResultLine } from "./TabTitle";

export type PassOption = { id: string; name: string; priceCents: number; link: string | null };

function defaultMessage(studio: string, pass: PassOption | undefined) {
  if (!pass) return "";
  return `Thanks for dancing with us at ${studio}! If you'd like to keep going, our ${pass.name} is ${money(pass.priceCents).replace(/\.00$/, "")}. ${
    pass.link ? "You can buy it here:" : "Reply to this email and we'll set it up."
  }`;
}

/**
 * The studio's own pass offer, sent to its StepUp students by email with a
 * one-click way out. StepUp takes no commission on pass sales. It can also go
 * automatically the day after a student's first class.
 */
export function PassOfferCard({
  studioName,
  passes,
  firstCount,
  allCount,
  saved,
  history,
}: {
  studioName: string;
  passes: PassOption[];
  firstCount: number;
  allCount: number;
  saved: { auto: boolean; passId: string | null; message: string | null };
  history: { id: string; line: string }[];
}) {
  const [passId, setPassId] = useState(saved.passId && passes.some((p) => p.id === saved.passId) ? saved.passId : (passes[0]?.id ?? ""));
  const pass = passes.find((p) => p.id === passId);
  const [audience, setAudience] = useState<"FIRST" | "ALL">("FIRST");
  const [message, setMessage] = useState(saved.message ?? defaultMessage(studioName, pass));
  const [touched, setTouched] = useState(Boolean(saved.message));
  const [auto, setAuto] = useState(saved.auto);
  const [sendState, send, sending] = useActionState(sendPassOfferAction, undefined);
  const [passState, addPass, adding] = useActionState(savePassAction, undefined);
  const [adding2, setAdding2] = useState(passes.length === 0);
  const count = audience === "FIRST" ? firstCount : allCount;

  return (
    <section aria-labelledby="pass-title" className="sd-card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 90 }}>
      <h2 id="pass-title" className="sd-h3">
        Send your own pass offer
      </h2>
      {passes.length > 0 && (
        <form action={send} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Pass</span>
              <select
                className="su-fld"
                name="passId"
                value={passId}
                onChange={(e) => {
                  setPassId(e.target.value);
                  if (!touched) setMessage(defaultMessage(studioName, passes.find((p) => p.id === e.target.value)));
                }}
              >
                {passes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.priceCents).replace(/\.00$/, "")}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Send to</span>
              <select className="su-fld" name="audience" value={audience} onChange={(e) => setAudience(e.target.value as "FIRST" | "ALL")}>
                <option value="FIRST">Students after their first class ({firstCount})</option>
                <option value="ALL">Everyone who&apos;s booked you ({allCount})</option>
              </select>
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Message</span>
            <textarea
              className="su-fld"
              name="message"
              maxLength={600}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setTouched(true);
              }}
            />
            <span className="sd-hint">
              {pass?.link ? `The email links to ${pass.link}.` : "No link on this pass, so students reply to your email address."} Every email has a
              one-click way to stop your offers.
            </span>
          </label>
          <label className="sd-check">
            <input type="checkbox" name="auto" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            <span>Send automatically the day after a student&apos;s first class</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <button type="submit" className="sd-btn" disabled={sending || count === 0}>
              {sending ? "Sending…" : `Send to ${count} ${count === 1 ? "student" : "students"}`}
            </button>
            <button type="submit" name="saveOnly" value="on" className="sd-btn-ghost" disabled={sending}>
              {auto ? "Save automatic offer only" : "Save without sending"}
            </button>
            <span className="sd-hint">Commission only applies to StepUp bookings. When a student moves onto your pass, you keep 100%.</span>
          </div>
          <ResultLine r={sendState} />
        </form>
      )}

      {passes.length > 0 && !adding2 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span className="sd-hint">Your passes:</span>
          {passes.map((p) => (
            <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
              <strong>{p.name}</strong>
              <button
                type="button"
                className="sd-btn-ghost"
                style={{ padding: "4px 10px", fontSize: 12.5 }}
                aria-label={`Remove ${p.name}`}
                onClick={() => {
                  void archivePassAction(p.id);
                }}
              >
                Remove
              </button>
            </span>
          ))}
          <button type="button" className="sd-btn-dash" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => setAdding2(true)}>
            + Add a pass
          </button>
        </div>
      )}

      {adding2 && (
        <form action={addPass} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px", borderRadius: 18, background: "oklch(96% 0.01 70)" }}>
          <div style={{ fontWeight: 700 }}>{passes.length ? "Add a pass" : "First, add the pass you sell"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Name</span>
              <input className="su-fld" name="name" maxLength={60} placeholder="10-class pass" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Price ($)</span>
              <input className="su-fld" name="price" type="number" min={0} step="1" placeholder="180" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Link to buy it (optional)</span>
              <input className="su-fld" name="link" type="url" placeholder="https://yourstudio.com/passes" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="sd-btn" disabled={adding}>
              {adding ? "Saving…" : "Save pass"}
            </button>
            {passes.length > 0 && (
              <button type="button" className="sd-btn-ghost" onClick={() => setAdding2(false)}>
                Done
              </button>
            )}
            <span className="sd-hint">Sold by you, on your own system. StepUp only sends the offer.</span>
          </div>
          <ResultLine r={passState} />
        </form>
      )}

      {history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Sent</div>
          {history.map((h) => (
            <div key={h.id} className="sd-hint">
              {h.line}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
