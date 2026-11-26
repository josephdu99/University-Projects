"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { getStudioAccess } from "@/lib/studio-access";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { claudeConfigured, proposeMapping } from "@/lib/schedule-claude";
import { approveChange, fetchSheetCsv, ignoreChange, publishRows, syncSheets, tableWithMapping } from "@/lib/schedule-sync";
import { IMPORT_FIELDS, guessMapping, isSheetUrl, mappedCount, type ColumnMapping, type ReviewRow } from "@/lib/schedule-import";
import { logError } from "@/lib/logger";

export type Done = { ok: true; message: string } | { ok: false; error: string };
export type TableRead =
  | { ok: true; table: string[][]; mapping: ColumnMapping; hash?: string; name?: string; guessed: "headers" | "claude" | "none" }
  | { ok: false; error: string };

async function studioFor() {
  const user = await getSessionUser();
  if (!user) return null;
  const access = await getStudioAccess(user.id);
  return access?.studio ?? null;
}

/**
 * Header names first; if fewer than three columns match, the first row is
 * probably data, so ask Claude once (when it's set up) which column is which.
 */
async function withMapping(table: string[][], saved?: ColumnMapping | null): Promise<{ table: string[][]; mapping: ColumnMapping; guessed: "headers" | "claude" | "none" }> {
  const guess = { mapping: saved && Object.keys(saved).length ? saved : guessMapping(table[0] ?? []) };
  if (mappedCount(guess.mapping) >= 3 || !claudeConfigured()) return { mapping: guess.mapping, table, guessed: mappedCount(guess.mapping) ? "headers" : "none" };
  const proposed = await proposeMapping(table);
  if (!proposed || mappedCount(proposed.mapping) === 0) return { table, mapping: guess.mapping, guessed: "none" };
  const width = Math.max(...table.map((r) => r.length));
  const withHeader = proposed.headerRow ? table : [Array.from({ length: width }, (_, i) => `Column ${i + 1}`), ...table];
  return { table: withHeader, mapping: proposed.mapping, guessed: "claude" };
}

/** Option 2: fetch a published sheet and read its rows (nothing is saved yet). */
export async function readSheetAction(url: string): Promise<TableRead> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Only the people who run a studio can import a timetable." };
  const u = String(url ?? "").trim();
  if (!isSheetUrl(u)) return { ok: false, error: "That isn’t a Google Sheets link. Use File › Share › Publish to web, then copy the CSV link." };
  const limit = await checkRateLimit(`sheet-read:${studio.id}`, 20, 60 * 60_000);
  if (!limit.allowed) return { ok: false, error: "That's a lot of sheet reads. Try again in a little while." };
  const got = await fetchSheetCsv(u);
  if (!got.ok) return got;
  const { table } = tableWithMapping(got.text);
  if (table.length < 2) return { ok: false, error: "That sheet looks empty." };
  if (table.length > 301) return { ok: false, error: "That sheet has more than 300 rows. Publish just the timetable tab." };
  const r = await withMapping(table);
  return { ok: true, ...r, hash: got.hash, name: `${studio.name} timetable` };
}

/** Option 3: pasted cells, one-off. */
export async function readPasteAction(text: string): Promise<TableRead> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Only the people who run a studio can import a timetable." };
  const { table } = tableWithMapping(String(text ?? "").slice(0, 200_000));
  if (table.length < 2) return { ok: false, error: "Paste at least a header row and one class." };
  if (table.length > 301) return { ok: false, error: "That's more than 300 rows. Paste the timetable a bit at a time." };
  return { ok: true, ...(await withMapping(table)) };
}

const RowSchema = z.object({
  key: z.string().max(80),
  include: z.boolean(),
  title: z.string().max(120),
  style: z.string().max(40),
  level: z.enum(["", "ABSOLUTE_BEGINNER", "BEGINNER", "IMPROVER", "INTERMEDIATE", "ADVANCED"]),
  day: z.enum(["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  time: z.string().max(5),
  dur: z.enum(["45", "60", "75", "90"]),
  teacher: z.string().max(40),
  venue: z.string().max(40),
  room: z.string().max(40),
  price: z.string().max(6),
  setAside: z.string().max(3),
  repeat: z.enum(["weekly", "fortnightly", "once"]),
  kids: z.boolean(),
  check: z.array(z.string()).max(12),
  notes: z.array(z.string().max(400)).max(12),
  dup: z.boolean(),
  rowKey: z.string().max(80),
  raw: z.object({ title: z.string(), day: z.string(), time: z.string(), teacher: z.string(), venue: z.string(), level: z.string() }),
});

const PublishSchema = z.object({
  rows: z.array(RowSchema).max(300),
  source: z.object({
    kind: z.enum(["SHEET_CSV", "PASTE", "IMAGE"]),
    name: z.string().max(120),
    url: z.string().max(500).nullable().optional(),
    mapping: z.record(z.string(), z.string()).nullable().optional(),
    headers: z.array(z.string().max(120)).max(60).optional(),
    hash: z.string().max(80).nullable().optional(),
    runId: z.string().max(40).nullable().optional(),
  }),
});

/** "Create N classes": nothing goes live before this. */
export async function createImportedClassesAction(payload: unknown): Promise<Done & { created?: number }> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Only the people who run a studio can add classes." };
  const parsed = PublishSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Something in the table didn't come through. Try again." };
  const { rows, source } = parsed.data;
  if (source.kind === "SHEET_CSV" && !(source.url && isSheetUrl(source.url))) return { ok: false, error: "That isn’t a Google Sheets link." };
  const mapping = Object.fromEntries(Object.entries(source.mapping ?? {}).filter(([k]) => IMPORT_FIELDS.some((f) => f.id === k))) as ColumnMapping;
  let res;
  try {
    res = await publishRows(studio, rows as ReviewRow[], { ...source, mapping });
  } catch (err) {
    logError("import.publish", err, { studioId: studio.id });
    return { ok: false, error: "We couldn't create those classes. Try again in a moment." };
  }
  for (const p of ["/studio", "/discover", "/start"]) revalidatePath(p);
  const n = res.created.length;
  const from = source.kind === "IMAGE" ? "your image" : source.kind === "SHEET_CSV" ? "your Google Sheet" : "your pasted timetable";
  if (n === 0) return { ok: false, error: res.skipped.length ? `None could be created yet. ${res.skipped[0].title}: ${res.skipped[0].why}` : "Select at least one class." };
  const skipped = res.skipped.length ? ` ${res.skipped.length} couldn't be created: ${res.skipped.map((s) => `${s.title} (${s.why})`).join("; ")}` : "";
  return { ok: true, created: n, message: `${n} ${n === 1 ? "class" : "classes"} created from ${from} and live on StepUp.${skipped}` };
}

/** "Sync now": once a minute per studio. */
export async function syncNowAction(): Promise<Done> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Not allowed." };
  const limit = await checkRateLimit(`sheet-sync:${studio.id}`, 1, 60_000);
  if (!limit.allowed) return { ok: false, error: "Synced a moment ago. Try again in a minute." };
  const [r] = await syncSheets({ studioId: studio.id });
  revalidatePath("/studio");
  if (!r) return { ok: false, error: "No sheet is connected." };
  if (r.error) return { ok: false, error: r.error };
  if (r.unchanged || r.added + r.updated + r.waiting + r.removed === 0) return { ok: true, message: "Your sheet and StepUp match. Nothing to change." };
  const parts = [
    r.added && `${r.added} added`,
    r.updated && `${r.updated} updated`,
    r.removed && `${r.removed} taken off`,
    r.waiting && `${r.waiting} waiting for your approval`,
  ].filter(Boolean);
  return { ok: true, message: `Synced: ${parts.join(", ")}.` };
}

/** Classes stay as they are; the sheet just stops syncing. */
export async function disconnectSheetAction(): Promise<Done> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Not allowed." };
  await db.scheduleSource.deleteMany({ where: { studioId: studio.id, kind: "SHEET_CSV" } });
  revalidatePath("/studio");
  return { ok: true, message: "Sheet disconnected. Your classes stay as they are." };
}

export async function approveChangeAction(changeId: string): Promise<Done> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Not allowed." };
  const r = await approveChange(studio, changeId).catch((err) => {
    logError("import.approveChange", err, { studioId: studio.id });
    return { ok: false as const, error: "We couldn't apply that change. Try again." };
  });
  revalidatePath("/studio");
  return r;
}

export async function ignoreChangeAction(changeId: string): Promise<Done> {
  const studio = await studioFor();
  if (!studio) return { ok: false, error: "Not allowed." };
  const r = await ignoreChange(studio, changeId);
  revalidatePath("/studio");
  return r;
}
