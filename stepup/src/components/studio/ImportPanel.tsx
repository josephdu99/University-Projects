"use client";

import { useMemo, useState, useTransition } from "react";
import { DISPLAY } from "@/lib/marketing-theme";
import { DANCE_STYLES, DAYS, LENGTHS } from "@/lib/class-form";
import { LEVEL_SCALE } from "@/lib/levels";
import {
  IMPORT_FIELDS,
  TEMPLATE_COLUMNS,
  isSheetUrl,
  matchRow,
  missingFields,
  reviewSummary,
  rowBlockers,
  rowsFromTable,
  type ColumnMapping,
  type RawRow,
  type ReviewField,
  type ReviewRow,
  type StudioContext,
} from "@/lib/schedule-import";
import {
  approveChangeAction,
  createImportedClassesAction,
  disconnectSheetAction,
  ignoreChangeAction,
  readPasteAction,
  readSheetAction,
  syncNowAction,
} from "@/lib/actions/schedule-actions";
import { CloseButton } from "./CreateClassV2";
import { PANEL_ID, useStudioPanels } from "./StudioPanels";

export type ImportSheet = {
  name: string;
  checkedLabel: string;
  error: string | null;
  pendingNote: string | null;
};

export type ImportProps = {
  studioName: string;
  ctx: StudioContext & { canCharge: boolean };
  claudeOn: boolean;
  sheet: ImportSheet | null;
  changes: { id: string; text: string }[];
};

type Mode = "sheet" | "image";
type Source = "sheet" | "paste" | "image";

const ERR_BG = "oklch(95% 0.03 30)";
const ERR_BORDER = "oklch(55% 0.16 30)";
const WARN_BG = "oklch(94% 0.06 85)";
const WARN_BORDER = "oklch(62% 0.13 75)";

/** Photos are shrunk in the browser first, so uploads stay small. */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 3_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
  } catch {
    // A format the browser can't draw (HEIC on some browsers): send as is,
    // and the server says which formats work.
    return file;
  }
}

/**
 * Import schedule (flow v6.6): bring the studio's timetable in from a
 * Google Sheet (template, published CSV link kept in sync, or pasted
 * cells) or an image or PDF read by Claude. Everything lands in one review
 * table; nothing is live until "Create N classes".
 */
export function ImportPanel({ studioName, ctx, claudeOn, sheet, changes }: ImportProps) {
  const { open, close, setToast } = useStudioPanels();
  const [mode, setMode] = useState<Mode>("sheet");
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingNote, setMappingNote] = useState("");
  const [source, setSource] = useState<Source>("paste");
  const [sheetMeta, setSheetMeta] = useState<{ url: string; hash?: string; name: string } | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [image, setImage] = useState<{ file: File; preview: string | null } | null>(null);
  const [imageRun, setImageRun] = useState<{ runId: string; name: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const venueOpts = useMemo(() => [{ id: "studio", name: studioName }, ...ctx.venues.map((v) => ({ id: v.id, name: v.name }))], [studioName, ctx.venues]);
  const styleOpts = useMemo(() => [...new Set([...ctx.styles, ...DANCE_STYLES])], [ctx.styles]);

  if (open !== "import") return null;

  const loadTable = (t: string[][], m: ColumnMapping, src: Source, note: string) => {
    setTable(t);
    setMapping(m);
    setSource(src);
    setMappingNote(note);
    setRows(rowsFromTable(t, m).map((r) => matchRow(r, ctx)));
    setError(null);
  };
  const remap = (m: ColumnMapping) => {
    setMapping(m);
    if (table) setRows(rowsFromTable(table, m).map((r) => matchRow(r, ctx)));
  };
  const reset = () => {
    setTable(null);
    setRows([]);
    setMapping({});
    setImage(null);
    setImageRun(null);
    setSheetMeta(null);
    setPaste("");
    setError(null);
  };
  const updRow = (key: string, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, check: r.check.filter((f) => !(f in patch)) } : r)));

  const run = (label: string, fn: () => Promise<void>) => {
    setError(null);
    setBusy(label);
    start(async () => {
      try {
        await fn();
      } catch {
        setError("We couldn't reach StepUp. Check your connection and try again.");
      } finally {
        setBusy(null);
      }
    });
  };

  const connect = (e: React.FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (!isSheetUrl(u)) {
      setError("That isn’t a Google Sheets link. Use File › Share › Publish to web, then copy the CSV link.");
      return;
    }
    run("sheet", async () => {
      const r = await readSheetAction(u);
      if (!r.ok) return setError(r.error);
      setSheetMeta({ url: u, hash: r.hash, name: r.name ?? `${studioName} timetable` });
      loadTable(r.table, r.mapping, "sheet", r.guessed === "claude" ? "Your sheet has no header row we recognised, so Claude matched the columns. Check them." : "We matched these from your headers.");
    });
  };

  const readPaste = (e: React.FormEvent) => {
    e.preventDefault();
    run("paste", async () => {
      const r = await readPasteAction(paste);
      if (!r.ok) return setError(r.error);
      setSheetMeta(null);
      loadTable(r.table, r.mapping, "paste", r.guessed === "claude" ? "No header row we recognised, so Claude matched the columns. Check them." : "We matched these from your header row.");
    });
  };

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    setImage({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
    setRows([]);
    setTable(null);
    setImageRun(null);
    setError(null);
  };

  const readImage = () => {
    if (!image) return;
    run("image", async () => {
      const blob = await shrinkImage(image.file);
      if (blob.size > 4 * 1024 * 1024) return setError("That file is too big. Try one under 4 MB, or a screenshot.");
      const fd = new FormData();
      fd.set("file", blob, image.file.name);
      const res = await fetch("/api/import/image", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string; runId?: string; name?: string; rows?: RawRow[] } | null;
      if (!data?.ok || !data.rows) return setError(data?.error ?? "That file couldn't be read. Try again.");
      setTable(null);
      setSource("image");
      setImageRun({ runId: data.runId!, name: data.name ?? image.file.name });
      setRows(data.rows.map((r) => matchRow(r, ctx)));
    });
  };

  const included = rows.filter((r) => r.include);
  const blocked = included.filter((r) => rowBlockers(r, ctx).length);
  const canCreate = included.length > 0 && blocked.length === 0;

  const create = () => {
    if (!canCreate) return;
    run("create", async () => {
      const src =
        source === "sheet" && sheetMeta
          ? { kind: "SHEET_CSV" as const, name: sheetMeta.name, url: sheetMeta.url, mapping, headers: table?.[0] ?? [], hash: sheetMeta.hash ?? null }
          : source === "image" && imageRun
            ? { kind: "IMAGE" as const, name: imageRun.name, runId: imageRun.runId }
            : { kind: "PASTE" as const, name: "Pasted timetable", mapping, headers: table?.[0] ?? [] };
      const r = await createImportedClassesAction({ rows, source: src });
      if (!r.ok) return setError(r.error);
      setToast(r.message);
      reset();
      setUrl("");
      if (src.kind !== "SHEET_CSV") close();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const quick = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    run("quick", async () => {
      const r = await fn();
      if (r.ok && r.message) setToast(r.message);
      else if (!r.ok) setError(r.error ?? "That didn't work. Try again.");
    });

  const cell = (r: ReviewRow, f: ReviewField): React.CSSProperties => {
    const needed = missingFields(r).includes(f);
    const guess = r.check.includes(f);
    return {
      height: 40,
      minWidth: f === "title" ? 170 : f === "teacher" || f === "venue" ? 150 : 92,
      fontSize: 14,
      padding: "0 10px",
      borderRadius: 10,
      ...(needed ? { background: ERR_BG, borderColor: ERR_BORDER } : guess ? { background: WARN_BG, borderColor: WARN_BORDER } : {}),
    };
  };

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    [
      TEMPLATE_COLUMNS.join(","),
      ["Salsa Foundations", "Salsa", "Absolute beginner", "Tue", "19:00", "20:00", ctx.teachers[0]?.name ?? "Your teacher", venueOpts[1]?.name ?? "Studio A", "25", "6", "Weekly"].join(","),
    ].join("\r\n") + "\r\n",
  )}`;

  return (
    <section
      id={PANEL_ID.import}
      aria-labelledby="import-title"
      className="su-panel-in"
      style={{
        marginBottom: 28,
        background: "oklch(99% 0.005 70)",
        border: "1.5px solid oklch(22% 0.02 60)",
        borderRadius: 28,
        padding: "30px clamp(18px, 3.5vw, 40px)",
        scrollMarginTop: 90,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <div className="sd-kicker" style={{ marginBottom: 6 }}>
            Import schedule
          </div>
          <h2 id="import-title" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", margin: 0 }}>
            Bring in your timetable
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "oklch(38% 0.02 60)" }}>
            Keep using your Google Sheet, or drop in a photo of your timetable. Nothing goes live until you&apos;ve checked it.
          </p>
        </div>
        <CloseButton onClick={close} label="Close import schedule" />
      </div>

      <div role="tablist" aria-label="Import source" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {(
          [
            ["sheet", "Google Sheet", "Connect or paste your timetable"],
            ["image", "Image or PDF", "Drop in a photo or flyer"],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              setMode(id);
              setError(null);
            }}
            className="su-btn"
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 2,
              padding: "12px 18px",
              borderRadius: 16,
              border: `1.5px solid ${mode === id ? "oklch(22% 0.02 60)" : "oklch(86% 0.012 70)"}`,
              background: mode === id ? "oklch(22% 0.02 60)" : "transparent",
              color: mode === id ? "#fff" : "oklch(22% 0.02 60)",
              textAlign: "left",
              font: "inherit",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
            <span style={{ fontSize: 13, opacity: 0.8 }}>{hint}</span>
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="sd-err" style={{ fontSize: 15, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {mode === "sheet" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sheet && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderRadius: 18, background: "oklch(93% 0.06 150 / 0.5)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong>Connected: {sheet.name}</strong>
                <span className="sd-hint">{`Last checked ${sheet.checkedLabel} · checks daily and when you open your dashboard · changes to booked classes wait for your approval`}</span>
                {sheet.error && <span className="sd-err">{sheet.error}</span>}
                {sheet.pendingNote && (
                  <span className="sd-hint" style={{ whiteSpace: "pre-line" }}>
                    {`Rows in your sheet that couldn't be added yet:\n${sheet.pendingNote}\nFix them in the sheet; they're added on the next sync.`}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="sd-btn" disabled={pending} onClick={() => quick(syncNowAction)}>
                  {busy === "quick" ? "Syncing…" : "Sync now"}
                </button>
                <button type="button" className="sd-btn-ghost" disabled={pending} onClick={() => quick(disconnectSheetAction)}>
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {changes.length > 0 && (
            <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px", borderRadius: 18, background: WARN_BG }}>
              <strong>{`${changes.length} ${changes.length === 1 ? "change needs" : "changes need"} your approval`}</strong>
              {changes.map((ch) => (
                <div key={ch.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 14.5 }}>{ch.text}</span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="sd-btn" disabled={pending} onClick={() => quick(() => approveChangeAction(ch.id))}>
                      Approve and tell students
                    </button>
                    <button type="button" className="sd-btn-ghost" disabled={pending} onClick={() => quick(() => ignoreChangeAction(ch.id))}>
                      Keep StepUp as is
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {rows.length === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
              <div className="sd-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="sd-kicker">Option 1 · easiest</span>
                <strong>Start from the StepUp template</strong>
                <span style={{ fontSize: 14 }}>{`A sheet with the columns StepUp reads: ${TEMPLATE_COLUMNS.join(", ")}.`}</span>
                <div>
                  <a href={templateHref} download="stepup-timetable-template.csv" className="sd-btn-ghost">
                    Download the template
                  </a>
                </div>
                <span className="sd-hint">In Google Sheets: File › Import › Upload, fill it in, then connect it here.</span>
              </div>

              <form onSubmit={connect} className="sd-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="sd-kicker">Option 2 · keep it in sync</span>
                <label htmlFor="sheet-url" style={{ fontWeight: 700 }}>
                  Connect your sheet
                </label>
                <span style={{ fontSize: 14 }}>
                  In Google Sheets: File › Share › Publish to web › choose the tab › Comma-separated values (.csv). Paste the link here.
                </span>
                <input
                  id="sheet-url"
                  className="su-fld"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"
                  style={{ height: 46 }}
                />
                <div>
                  <button type="submit" className="sd-btn" disabled={pending}>
                    {busy === "sheet" ? "Reading your sheet…" : "Connect sheet"}
                  </button>
                </div>
                <span className="sd-hint">StepUp checks it once a day, and again when you open your dashboard or press Sync now.</span>
              </form>

              <form onSubmit={readPaste} className="sd-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="sd-kicker">Option 3 · one-off</span>
                <label htmlFor="sheet-paste" style={{ fontWeight: 700 }}>
                  Paste your cells
                </label>
                <span style={{ fontSize: 14 }}>Select your timetable in any spreadsheet, including the header row, copy it and paste it here.</span>
                <textarea
                  id="sheet-paste"
                  className="su-fld"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={"Class\tDay\tStart\tEnd\tTeacher …"}
                  style={{ minHeight: 110, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
                />
                <div>
                  <button type="submit" className="sd-btn" disabled={pending || !paste.trim()}>
                    {busy === "paste" ? "Reading…" : "Read these rows"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {mode === "image" && rows.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "stretch" }}>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickImage(e.dataTransfer.files?.[0]);
            }}
            style={{
              position: "relative",
              flex: "1 1 320px",
              minHeight: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textAlign: "center",
              padding: 24,
              borderRadius: 22,
              cursor: "pointer",
              border: `2px dashed ${dragOver ? "oklch(66% 0.19 35)" : "oklch(70% 0.02 60)"}`,
              background: dragOver ? "oklch(96% 0.04 45)" : "oklch(97.5% 0.012 70)",
              color: "oklch(32% 0.02 60)",
            }}
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => pickImage(e.target.files?.[0])}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              aria-label="Choose a timetable image or PDF"
            />
            <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <circle cx="16" cy="9" r="1.6" fill="currentColor" />
            </svg>
            <strong>Drop a timetable image here</strong>
            <span style={{ fontSize: 14 }}>
              or click to choose one. A screenshot, an Instagram flyer, a PDF or a photo of a handwritten schedule all work.
            </span>
          </label>
          {image && (
            <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 10 }}>
              {image.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.preview} alt="Your uploaded timetable" style={{ maxWidth: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 16, border: "1px solid oklch(88% 0.01 70)" }} />
              )}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <span className="sd-hint">{image.file.name}</span>
                <button type="button" className="sd-btn" disabled={pending || !claudeOn} onClick={readImage}>
                  {busy === "image" ? "Reading…" : "Read timetable"}
                </button>
              </div>
              {busy === "image" && (
                <div role="status" className="sd-hint">
                  Reading days, times, teachers and rooms…
                </div>
              )}
              <span className="sd-hint">
                {claudeOn
                  ? "Claude reads it and matches it to your teachers, venues, styles and levels. You check everything before it goes live."
                  : "Reading images isn't switched on for StepUp yet. Paste your cells or connect a sheet instead."}
              </span>
            </div>
          )}
        </div>
      )}

      {table && source !== "image" && rows.length > 0 && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 }}>
            <strong>Match your columns</strong>
            <span className="sd-hint">{mappingNote}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 10 }}>
            {IMPORT_FIELDS.map((f) => (
              <label key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{f.label}</span>
                <select
                  className="su-fld"
                  style={{ height: 42, fontSize: 14 }}
                  value={mapping[f.id] ?? ""}
                  onChange={(e) => remap({ ...mapping, [f.id]: e.target.value })}
                >
                  <option value="">Not in my sheet</option>
                  {(table[0] ?? []).map((h, i) => (
                    <option key={i} value={String(i)}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {source === "sheet" && <span className="sd-hint">Saved for this sheet, so future syncs use the same mapping.</span>}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h3 className="sd-h3">Check before anything goes live</h3>
            <p className="sd-hint" style={{ margin: "4px 0 0" }}>
              {reviewSummary(rows)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden style={{ width: 14, height: 14, borderRadius: 4, background: WARN_BG, border: `1.5px solid ${WARN_BORDER}` }} /> Check this
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden style={{ width: 14, height: 14, borderRadius: 4, background: ERR_BG, border: `1.5px solid ${ERR_BORDER}` }} /> Needed
            </span>
          </div>
          <div className="sd-card sd-scroll-x">
            <table className="sd-tbl" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sd-sr">Include</span>
                  </th>
                  <th scope="col">Class</th>
                  <th scope="col">Style</th>
                  <th scope="col">Level</th>
                  <th scope="col">Day</th>
                  <th scope="col">Start</th>
                  <th scope="col">Length</th>
                  <th scope="col">Teacher</th>
                  <th scope="col">Venue</th>
                  <th scope="col">Price ($)</th>
                  <th scope="col">StepUp spots</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const blockers = r.include ? rowBlockers(r, ctx) : [];
                  return (
                    <tr key={r.key} style={r.include ? undefined : { opacity: 0.55 }}>
                      <td>
                        <input type="checkbox" checked={r.include} onChange={() => updRow(r.key, { include: !r.include })} aria-label={`Include ${r.title || "this row"}`} style={{ width: 18, height: 18 }} />
                      </td>
                      <td>
                        <input className="su-fld" aria-label="Class name" value={r.title} maxLength={80} onChange={(e) => updRow(r.key, { title: e.target.value })} style={cell(r, "title")} />
                      </td>
                      <td>
                        <select className="su-fld" aria-label="Style" value={r.style} onChange={(e) => updRow(r.key, { style: e.target.value })} style={cell(r, "style")}>
                          <option value="">?</option>
                          {styleOpts.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="su-fld" aria-label="Level" value={r.level} onChange={(e) => updRow(r.key, { level: e.target.value as ReviewRow["level"] })} style={cell(r, "level")}>
                          <option value="">?</option>
                          {LEVEL_SCALE.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="su-fld" aria-label="Day" value={r.day} onChange={(e) => updRow(r.key, { day: e.target.value as ReviewRow["day"] })} style={cell(r, "day")}>
                          <option value="">?</option>
                          {DAYS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="su-fld" type="time" aria-label="Start time" value={r.time} onChange={(e) => updRow(r.key, { time: e.target.value })} style={cell(r, "time")} />
                      </td>
                      <td>
                        <select className="su-fld" aria-label="Length" value={r.dur} onChange={(e) => updRow(r.key, { dur: e.target.value })} style={cell(r, "dur")}>
                          {LENGTHS.map((l) => (
                            <option key={l.min} value={String(l.min)}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="su-fld" aria-label="Teacher" value={r.teacher} onChange={(e) => updRow(r.key, { teacher: e.target.value })} style={cell(r, "teacher")}>
                          <option value="">?</option>
                          {ctx.teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="su-fld" aria-label="Venue" value={r.venue} onChange={(e) => updRow(r.key, { venue: e.target.value, room: e.target.value === "studio" ? r.room : "" })} style={cell(r, "venue")}>
                          {venueOpts.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.id === "studio" && r.room ? `${v.name}, ${r.room}` : v.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="su-fld" type="number" min={0} aria-label="Price" value={r.price} onChange={(e) => updRow(r.key, { price: e.target.value })} style={{ ...cell(r, "price"), minWidth: 80, width: 90 }} />
                      </td>
                      <td>
                        <input className="su-fld" type="number" min={1} max={80} aria-label="StepUp spots" value={r.setAside} onChange={(e) => updRow(r.key, { setAside: e.target.value })} style={{ ...cell(r, "setAside"), minWidth: 70, width: 80 }} />
                      </td>
                      <td style={{ minWidth: 240, maxWidth: 360 }}>
                        <span className={blockers.length ? "sd-err" : "sd-hint"} style={{ fontSize: 13 }}>
                          {[...blockers, ...r.notes.filter((n) => !blockers.some((b) => b.includes(n)))].join(" ") || "Looks good."}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 6 }}>
            <button
              type="button"
              className="su-btn"
              onClick={reset}
              style={{ border: 0, background: "transparent", cursor: "pointer", font: "inherit", fontWeight: 600, fontSize: 15, padding: "12px 4px", color: "oklch(42% 0.02 60)" }}
            >
              Start again
            </button>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <span className="sd-hint">
                {blocked.length ? `${blocked.length} selected ${blocked.length === 1 ? "class needs" : "classes need"} the red cells filled in.` : ""}
              </span>
              <button
                type="button"
                onClick={create}
                disabled={pending}
                className="su-btn"
                style={{
                  border: 0,
                  cursor: canCreate && !pending ? "pointer" : "default",
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "15px 26px",
                  borderRadius: 999,
                  background: canCreate ? "oklch(66% 0.19 35)" : "oklch(88% 0.01 70)",
                  color: canCreate ? "#fff" : "oklch(40% 0.02 60)",
                }}
              >
                {busy === "create" ? "Creating…" : `Create ${included.length} ${included.length === 1 ? "class" : "classes"}`}
              </button>
            </div>
          </div>
          <span className="sd-hint">
            New classes are listed as drop-in (free ones as trials) and use your studio&apos;s First Timer promise and cancellation policy. Change any of
            them afterwards from the class.
          </span>
        </div>
      )}

      {mode === "sheet" && (
        <details style={{ marginTop: 22 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>How syncing works</summary>
          <ul style={{ margin: "10px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5 }}>
            <li>Your sheet stays the place you plan your timetable. Changes flow from the sheet into StepUp, never the other way.</li>
            <li>
              StepUp checks your sheet once a day, early in the morning, and again whenever you open this dashboard or press Sync now. Changed
              something urgent? Press Sync now.
            </li>
            <li>New rows, and changes to classes nobody has booked yet, are applied automatically.</li>
            <li>If a class with bookings changes or disappears from the sheet, nothing happens to students until you approve it here.</li>
            <li>One-off rows are created once and not synced afterwards; change those on StepUp.</li>
          </ul>
        </details>
      )}
    </section>
  );
}
