import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { IMPORT_FIELDS, parseDay, parsePrice, parseRepeat, parseTime, type ColumnMapping, type RawRow, type ReviewField } from "@/lib/schedule-import";

/**
 * Claude reads a timetable (an image or a PDF) into rows, and proposes a
 * column mapping for a sheet with no header row. Server-only: the API key
 * never leaves the server.
 */

export const IMPORT_MODEL = "claude-opus-5-5";

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cached: Anthropic | null = null;
function client(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment.
  cached ??= new Anthropic();
  return cached;
}

export type ImageMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** What the studio knows, so Claude matches to it instead of guessing. */
export type ReadContext = {
  studioName: string;
  teachers: string[];
  venues: string[];
  styles: readonly string[];
  levelNames: { name: string; scale: string }[];
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });
const FIELDS = ["title", "style", "level_raw", "day", "start", "end", "teacher_raw", "venue_raw", "price", "spots", "repeats"] as const;

const ROWS_TOOL: Anthropic.Beta.BetaTool = {
  name: "create_schedule_rows",
  description:
    "Record the classes in the studio's timetable: one row per class per weekday it runs. Call this exactly once, with every class you can see.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      rows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: nullable({ type: "string", description: "The class name as written." }),
            style: nullable({ type: "string", description: "Dance style, using one of the studio's styles where it matches." }),
            level_raw: nullable({ type: "string", description: "The level exactly as written, e.g. 'Level 1' or 'Open level'." }),
            day: nullable({ type: "string", enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }),
            start: nullable({ type: "string", description: "24-hour start time, HH:MM." }),
            end: nullable({ type: "string", description: "24-hour end time, HH:MM." }),
            teacher_raw: nullable({ type: "string", description: "The teacher's name as written." }),
            venue_raw: nullable({ type: "string", description: "The venue or room as written." }),
            price: nullable({ type: "string", description: "Drop-in price in dollars, digits only, or 'Free'." }),
            spots: nullable({ type: "integer", description: "Number of places, if shown." }),
            repeats: nullable({ type: "string", enum: ["weekly", "fortnightly", "once"] }),
            is_kids: { type: "boolean", description: "True if it's a children's or teens' class." },
            uncertain: { type: "array", items: { type: "string", enum: [...FIELDS] }, description: "Fields you couldn't read clearly." },
            note: nullable({ type: "string", description: "One short sentence on anything unclear, e.g. 'End time was cut off.'" }),
          },
          required: [...FIELDS, "is_kids", "uncertain", "note"],
          additionalProperties: false,
        },
      },
    },
    required: ["rows"],
    additionalProperties: false,
  },
};

const RowsInput = z.object({
  rows: z.array(
    z.object({
      title: z.string().nullable(),
      style: z.string().nullable(),
      level_raw: z.string().nullable(),
      day: z.string().nullable(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      teacher_raw: z.string().nullable(),
      venue_raw: z.string().nullable(),
      price: z.string().nullable(),
      spots: z.number().int().nullable(),
      repeats: z.string().nullable(),
      is_kids: z.boolean(),
      uncertain: z.array(z.string()),
      note: z.string().nullable(),
    }),
  ),
});

const UNCERTAIN_TO_REVIEW: Record<string, ReviewField> = {
  title: "title",
  style: "style",
  level_raw: "level",
  day: "day",
  start: "time",
  end: "dur",
  teacher_raw: "teacher",
  venue_raw: "venue",
  price: "price",
  spots: "setAside",
  repeats: "day",
};

function systemPrompt(ctx: ReadContext): string {
  const list = (xs: readonly string[]) => (xs.length ? xs.join(", ") : "(none yet)");
  return [
    `You read dance studio timetables for ${ctx.studioName} so they can be listed on StepUp.`,
    "Read the image or document the studio uploaded and call the create_schedule_rows tool once with every class in it.",
    "One row per class per weekday: a class on Tuesdays and Thursdays is two rows.",
    "",
    "Match to what the studio already has, and never invent anything:",
    `- Teachers on the team: ${list(ctx.teachers)}. Write the name as it appears in the timetable; if it isn't one of these, still write it as shown.`,
    `- Saved venues: ${list(ctx.venues)}. Rooms like "Studio B" go in venue_raw as written.`,
    `- Styles the studio teaches: ${list(ctx.styles)}.`,
    `- The studio's level names: ${ctx.levelNames.length ? ctx.levelNames.map((l) => `${l.name} (${l.scale})`).join(", ") : "(none mapped)"}. Write the level exactly as shown.`,
    "",
    "If a value isn't shown or you can't read it, return null for it and add the field name to uncertain. Don't guess. If a value is readable but ambiguous (a price that could be $30 or $38), give your best reading, add the field to uncertain and say why in note.",
    "Times are 24-hour HH:MM. If the timetable says only '7' for an evening class, that's 19:00.",
  ].join("\n");
}

export type ReadResult =
  | { ok: true; rows: RawRow[]; model: string; inputTokens: number; outputTokens: number }
  | { ok: false; error: string; model?: string; inputTokens?: number; outputTokens?: number };

/**
 * Read a timetable image or PDF. `auto` tool choice (forced calls aren't
 * available on this model) with a strict schema; if no call comes back the
 * caller gets a plain error rather than a guess.
 */
export async function readTimetable(
  file: { bytes: Uint8Array; media: ImageMedia | "application/pdf" },
  ctx: ReadContext,
): Promise<ReadResult> {
  const data = Buffer.from(file.bytes).toString("base64");
  const media: Anthropic.Beta.BetaContentBlockParam =
    file.media === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.media, data } };

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client().beta.messages.create({
      model: IMPORT_MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on its recommended
      // fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: systemPrompt(ctx),
      tools: [ROWS_TOOL],
      messages: [
        {
          role: "user",
          content: [media, { type: "text", text: "Here's our timetable. Read every class and call create_schedule_rows." }],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "The timetable reader is busy. Try again in a minute." };
    if (err instanceof Anthropic.BadRequestError) return { ok: false, error: "That file couldn't be read. Try a clearer image, or a PDF of 5 pages or fewer." };
    if (err instanceof Anthropic.APIError) return { ok: false, error: "The timetable reader didn't answer. Try again in a moment." };
    throw err;
  }

  const usage = { model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  if (response.stop_reason === "refusal") return { ok: false, error: "This file couldn't be read. Try a different image of the timetable.", ...usage };
  if (response.stop_reason === "max_tokens") return { ok: false, error: "That timetable is too long to read in one go. Try one page at a time.", ...usage };
  const call = response.content.find(
    (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === ROWS_TOOL.name,
  );
  if (!call) return { ok: false, error: "No classes were found in that file. Is it a timetable?", ...usage };
  const parsed = RowsInput.safeParse(call.input);
  if (!parsed.success) return { ok: false, error: "The timetable came back in a shape we couldn't use. Try again.", ...usage };

  const rows: RawRow[] = parsed.data.rows.slice(0, 200).map((r, index) => ({
    title: (r.title ?? "").trim(),
    style: (r.style ?? "").trim(),
    levelRaw: (r.level_raw ?? "").trim(),
    day: parseDay(r.day ?? ""),
    time: parseTime(r.start ?? ""),
    end: parseTime(r.end ?? ""),
    teacherRaw: (r.teacher_raw ?? "").trim(),
    venueRaw: (r.venue_raw ?? "").trim(),
    price: parsePrice(r.price ?? ""),
    spots: r.spots && r.spots > 0 ? String(Math.min(r.spots, 80)) : "",
    repeat: parseRepeat(r.repeats ?? ""),
    kids: r.is_kids,
    uncertain: [...new Set(r.uncertain.map((f) => UNCERTAIN_TO_REVIEW[f]).filter(Boolean))],
    why: (r.note ?? "").trim().slice(0, 200),
    index,
  }));
  return { ok: true, rows, ...usage };
}

// ─── Mapping a sheet with no header row ─────────────────────────────────────

const MAPPING_TOOL: Anthropic.Beta.BetaTool = {
  name: "propose_mapping",
  description: "Say which column holds which timetable field, and whether the first row is a header.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      first_row_is_header: { type: "boolean" },
      columns: {
        type: "object",
        properties: Object.fromEntries(IMPORT_FIELDS.map((f) => [f.id, nullable({ type: "integer", description: `0-based column for ${f.label}` })])),
        required: IMPORT_FIELDS.map((f) => f.id),
        additionalProperties: false,
      },
    },
    required: ["first_row_is_header", "columns"],
    additionalProperties: false,
  },
};

const MappingInput = z.object({
  first_row_is_header: z.boolean(),
  columns: z.record(z.string(), z.number().int().nullable()),
});

/**
 * For a sheet whose headers we can't match: send the first 20 rows once and
 * ask which column is which. The mapping is then saved, so later syncs are
 * plain code.
 */
export async function proposeMapping(table: string[][]): Promise<{ mapping: ColumnMapping; headerRow: boolean } | null> {
  if (!claudeConfigured()) return null;
  const sample = table
    .slice(0, 20)
    .map((r) => r.map((c) => c.slice(0, 60)).join("\t"))
    .join("\n");
  try {
    const response = await client().beta.messages.create({
      model: IMPORT_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system:
        "You map the columns of a dance studio's timetable spreadsheet to StepUp's fields. Call propose_mapping once. Use null for a field no column holds; never use one column for two fields.",
      tools: [MAPPING_TOOL],
      messages: [{ role: "user", content: `First rows of the sheet, tab-separated:\n\n${sample}` }],
    });
    const call = response.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === MAPPING_TOOL.name);
    if (response.stop_reason === "refusal" || !call) return null;
    const parsed = MappingInput.safeParse(call.input);
    if (!parsed.success) return null;
    const width = Math.max(...table.map((r) => r.length));
    const mapping: ColumnMapping = {};
    const used = new Set<number>();
    for (const f of IMPORT_FIELDS) {
      const c = parsed.data.columns[f.id];
      if (c !== null && c !== undefined && c >= 0 && c < width && !used.has(c)) {
        mapping[f.id] = String(c);
        used.add(c);
      }
    }
    return { mapping, headerRow: parsed.data.first_row_is_header };
  } catch {
    return null;
  }
}
