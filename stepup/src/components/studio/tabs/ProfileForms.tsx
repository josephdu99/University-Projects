"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addStudioPhotoAction,
  addVenueAction,
  removeStudioPhotoAction,
  removeVenueAction,
  saveLevelsAction,
  saveProfileAction,
  saveTemplateAction,
  type Result,
} from "@/lib/actions/studio-admin-actions";
import { LEVEL_SCALE } from "@/lib/levels";
import { templateFor } from "@/lib/class-templates";
import { Chip } from "@/components/onboarding/fields";
import { ResultLine } from "./TabTitle";

const ACCENT = "oklch(66% 0.19 35)";

/** Bio, photos and styles: the concierge draft, or the live profile to edit. */
export function ProfileDraftForm({
  bio,
  styles,
  allStyles,
  photos,
  approved,
  hasDraft,
}: {
  bio: string;
  styles: string[];
  allStyles: readonly string[];
  photos: { id: string; src: string; draft: boolean }[];
  approved: boolean;
  hasDraft: boolean;
}) {
  const [text, setText] = useState(bio);
  const [picked, setPicked] = useState<string[]>(styles);
  const [state, save, pending] = useActionState(saveProfileAction, undefined);
  const [photoState, addPhoto, adding] = useActionState(addStudioPhotoAction, undefined);
  const [removing, startRemove] = useTransition();
  const [removeResult, setRemoveResult] = useState<Result>(undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form action={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Bio</span>
          <textarea className="su-fld" name="bio" maxLength={280} value={text} onChange={(e) => setText(e.target.value)} />
          <span className="sd-hint">{280 - text.length} characters left</span>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }} id="profile-styles">
            Styles
          </span>
          <div role="group" aria-labelledby="profile-styles" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allStyles.map((s) => (
              <Chip key={s} on={picked.includes(s)} accent={ACCENT} onClick={() => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}>
                {s}
              </Chip>
            ))}
          </div>
          {picked.map((s) => (
            <input key={s} type="hidden" name="styles" value={s} />
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          {!approved || hasDraft ? (
            <>
              <button type="submit" name="approve" value="on" className="sd-btn" disabled={pending}>
                {pending ? "Publishing…" : "Approve and publish"}
              </button>
              <span className="sd-hint">Edit anything here first if you like.</span>
            </>
          ) : (
            <button type="submit" className="sd-btn" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </button>
          )}
        </div>
        <ResultLine r={state} />
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Photos</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={`Studio photo ${i + 1}`} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 12, display: "block" }} />
              {p.draft && (
                <span className="sd-chip" style={{ position: "absolute", left: 6, top: 6, background: "oklch(94% 0.06 85)", color: "oklch(40% 0.1 70)" }}>
                  Draft
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                disabled={removing}
                onClick={() => startRemove(async () => setRemoveResult(await removeStudioPhotoAction(p.id)))}
                style={{
                  position: "absolute",
                  right: 6,
                  top: 6,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: 0,
                  background: "oklch(22% 0.02 60 / 0.8)",
                  color: "#fff",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <form action={addPhoto}>
            <label
              className="sd-btn-dash"
              style={{ width: 120, height: 90, borderRadius: 12, position: "relative", overflow: "hidden", whiteSpace: "normal", textAlign: "center", fontSize: 13 }}
            >
              {adding ? "Uploading…" : "+ Add photo"}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </label>
          </form>
        </div>
        <ResultLine r={photoState} />
        <ResultLine r={removeResult && !removeResult.ok ? removeResult : undefined} />
      </div>
    </div>
  );
}

type LevelRow = { key: number; name: string; scale: string };

export function LevelsForm({ levels }: { levels: { name: string; scale: string }[] }) {
  const [rows, setRows] = useState<LevelRow[]>(() =>
    levels.length ? levels.map((l, i) => ({ key: i, ...l })) : [{ key: 0, name: "", scale: "ABSOLUTE_BEGINNER" }],
  );
  const [nextKey, setNextKey] = useState(levels.length + 1);
  const [state, save, pending] = useActionState(saveLevelsAction, undefined);
  return (
    <form action={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="sd-scroll-x">
        <table className="sd-tbl">
          <thead>
            <tr>
              <th scope="col">Your level name</th>
              <th scope="col">StepUp level</th>
              <th scope="col">
                <span className="sd-sr">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <input
                    className="su-fld"
                    name="levelName"
                    aria-label="Your level name"
                    maxLength={40}
                    value={r.name}
                    placeholder="Level 1"
                    style={{ height: 44, minWidth: 140 }}
                    onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
                  />
                </td>
                <td>
                  <select
                    className="su-fld"
                    name="levelScale"
                    aria-label={`StepUp level for ${r.name || "this level"}`}
                    value={r.scale}
                    style={{ height: 44, minWidth: 170 }}
                    onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, scale: e.target.value } : x)))}
                  >
                    {LEVEL_SCALE.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="sd-btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    aria-label={`Remove ${r.name || "level"}`}
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="sd-btn-dash"
          onClick={() => {
            setRows((rs) => [...rs, { key: nextKey, name: "", scale: "BEGINNER" }]);
            setNextKey((k) => k + 1);
          }}
        >
          + Add a level
        </button>
        <button type="submit" className="sd-btn" disabled={pending}>
          {pending ? "Saving…" : "Save levels"}
        </button>
      </div>
      <ResultLine r={state} />
    </form>
  );
}

export type SavedTpl = { style: string; scale: string; description: string; wear: string; plan: string };

export function TemplatesForm({ styles, saved }: { styles: readonly string[]; saved: SavedTpl[] }) {
  const [style, setStyle] = useState(styles[0] ?? "Salsa");
  const [scale, setScale] = useState("BEGINNER");
  const t = templateFor(style, scale, saved);
  const [state, save, pending] = useActionState(saveTemplateAction, undefined);
  const k = `${style}|${scale}|${t.saved ? "s" : "d"}`;
  return (
    <form action={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Style</span>
          <select className="su-fld" name="style" value={style} onChange={(e) => setStyle(e.target.value)}>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Level</span>
          <select className="su-fld" name="scale" value={scale} onChange={(e) => setScale(e.target.value)}>
            {LEVEL_SCALE.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Description</span>
        <textarea key={`d${k}`} className="su-fld" name="description" maxLength={600} defaultValue={t.description} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>What to wear</span>
        <input key={`w${k}`} className="su-fld" name="wear" maxLength={160} defaultValue={t.wear} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>How the hour runs</span>
        <textarea key={`p${k}`} className="su-fld" name="plan" maxLength={600} defaultValue={t.plan} />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <button type="submit" className="sd-btn" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
        </button>
        <span className="sd-hint">{t.saved ? "Your own template for this style and level." : "StepUp's starting point. Save it to make it yours."}</span>
      </div>
      <ResultLine r={state} />
    </form>
  );
}

export function VenuesForm({ venues }: { venues: { id: string; name: string; address: string; removable: boolean }[] }) {
  const [state, add, pending] = useActionState(addVenueAction, undefined);
  const [removing, start] = useTransition();
  const [removeResult, setRemoveResult] = useState<Result>(undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {venues.map((v) => (
          <li
            key={v.id}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 14, background: "oklch(96% 0.01 70)" }}
          >
            <span>
              <strong>{v.name}</strong>
              <br />
              <span className="sd-hint">{v.address}</span>
            </span>
            {v.removable && (
              <button
                type="button"
                className="sd-btn-ghost"
                aria-label={`Remove ${v.name}`}
                disabled={removing}
                onClick={() => start(async () => setRemoveResult(await removeVenueAction(v.id)))}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <ResultLine r={removeResult && !removeResult.ok ? removeResult : undefined} />
      <form action={add} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 200px" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Venue name</span>
          <input className="su-fld" name="name" maxLength={80} placeholder="Redfern Town Hall" required />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "2 1 260px" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Address</span>
          <input className="su-fld" name="address" maxLength={160} placeholder="73 Pitt St, Redfern" required />
        </label>
        <button type="submit" className="sd-btn" disabled={pending} style={{ height: 54 }}>
          {pending ? "Adding…" : "Add venue"}
        </button>
      </form>
      <ResultLine r={state} />
    </div>
  );
}
