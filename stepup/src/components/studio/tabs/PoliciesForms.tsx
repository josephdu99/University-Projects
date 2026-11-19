"use client";

import { useActionState, useState, useTransition } from "react";
import {
  publishTermsAction,
  setHealthUrlAction,
  setKidsClassesAction,
  setStudioPolicyAction,
  type Result,
} from "@/lib/actions/studio-admin-actions";
import { POLICIES, POLICY_IDS, type PolicyId } from "@/lib/policies";
import { templateSections } from "@/lib/terms-text";
import { ResultLine } from "./TabTitle";

/** The three presets, saved as soon as one is picked. */
export function PolicyPicker({ current }: { current: PolicyId }) {
  const [picked, setPicked] = useState<PolicyId>(current);
  const [r, setR] = useState<Result>(undefined);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div role="radiogroup" aria-label="Cancellation policy" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
        {POLICY_IDS.map((id) => {
          const p = POLICIES[id];
          return (
            <label key={id} className="sd-radio-card">
              <input
                type="radio"
                name="policy"
                checked={picked === id}
                disabled={pending}
                onChange={() => {
                  setPicked(id);
                  start(async () => setR(await setStudioPolicyAction(id)));
                }}
              />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong>{p.label}</strong>
                <span>Free cancellation until {p.until}</span>
                <span className="sd-hint">After that: {p.after}</span>
              </span>
            </label>
          );
        })}
      </div>
      <ResultLine r={r} />
    </div>
  );
}

export function TermsForm({
  current,
  policy,
}: {
  current: { mode: "TEMPLATE" | "UPLOAD"; waiver: boolean; conduct: boolean; cancellation: boolean; fileName: string | null } | null;
  nextVersion: number;
  policy: PolicyId;
}) {
  const [mode, setMode] = useState<"TEMPLATE" | "UPLOAD">(current?.mode ?? "TEMPLATE");
  const [parts, setParts] = useState({
    waiver: current?.waiver ?? true,
    conduct: current?.conduct ?? true,
    cancellation: current?.cancellation ?? true,
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, publish, pending] = useActionState(publishTermsAction, undefined);
  const sections = templateSections(parts, policy);

  return (
    <form action={publish} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
        {(
          [
            ["TEMPLATE", "Use StepUp's template", "Waiver, code of conduct and cancellation, in plain words."],
            ["UPLOAD", "Upload your own", "A PDF of your studio's terms."],
          ] as const
        ).map(([id, label, how]) => (
          <label key={id} className="sd-radio-card">
            <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong>{label}</strong>
              <span className="sd-hint">{how}</span>
            </span>
          </label>
        ))}
      </div>
      {mode === "TEMPLATE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(
            [
              ["waiver", "Waiver"],
              ["conduct", "Code of conduct"],
              ["cancellation", "Cancellation policy (follows your preset above)"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="sd-check">
              <input type="checkbox" name={k} checked={parts[k]} onChange={(e) => setParts((p) => ({ ...p, [k]: e.target.checked }))} />
              <span>{label}</span>
            </label>
          ))}
          {sections.length > 0 && (
            <details>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>What students read</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, padding: "12px 14px", borderRadius: 14, background: "oklch(96% 0.01 70)" }}>
                {sections.map((s) => (
                  <div key={s.title} style={{ fontSize: 14 }}>
                    <strong>{s.title}.</strong> {s.body}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      {mode === "UPLOAD" && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <label className="sd-btn-ghost" style={{ position: "relative", overflow: "hidden" }}>
            Upload your terms (PDF)
            <input
              type="file"
              name="file"
              accept="application/pdf"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            />
          </label>
          <span className="sd-hint">
            {fileName ?? (current?.mode === "UPLOAD" && current.fileName ? `Current: ${current.fileName}. Choose a new file to replace it.` : "No file chosen. Up to 5 MB.")}
          </span>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <button type="submit" className="sd-btn" disabled={pending}>
          {pending ? "Publishing…" : "Publish new version"}
        </button>
      </div>
      <ResultLine r={state} />
    </form>
  );
}

export function HealthLinkForm({ url }: { url: string | null }) {
  const [state, save, pending] = useActionState(setHealthUrlAction, undefined);
  return (
    <form action={save} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Health or injury form (optional link)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input className="su-fld" type="url" name="healthUrl" defaultValue={url ?? ""} placeholder="https://forms.yourstudio.com/health" style={{ flex: "1 1 260px" }} />
          <button type="submit" className="sd-btn-ghost" disabled={pending}>
            Save link
          </button>
        </div>
      </label>
      <span className="sd-hint">
        StepUp doesn&apos;t collect health or injury information. If you need it, students are sent to your own form after they book.
      </span>
      <ResultLine r={state} />
    </form>
  );
}

export function KidsToggle({ on }: { on: boolean }) {
  const [value, setValue] = useState(on);
  const [r, setR] = useState<Result>(undefined);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label className="sd-check" style={{ fontWeight: 700 }}>
        <input
          type="checkbox"
          checked={value}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.checked;
            setValue(v);
            start(async () => setR(await setKidsClassesAction(v)));
          }}
        />
        We run kids&apos; classes
      </label>
      <ResultLine r={r} />
    </div>
  );
}
