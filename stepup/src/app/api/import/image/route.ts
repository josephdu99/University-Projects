import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getStudioAccess } from "@/lib/studio-access";
import { sniffImageType } from "@/lib/image-type";
import { checkRateLimit } from "@/lib/rate-limit";
import { claudeConfigured, IMPORT_MODEL, readTimetable, type ImageMedia } from "@/lib/schedule-claude";
import { DANCE_STYLES } from "@/lib/class-form";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Read an uploaded timetable (image or PDF) with Claude, server-side so the
 * API key stays here. Returns rows for the review table; nothing is created
 * until the studio says so. Every run is logged with its token use.
 *
 * Files are kept to 4 MB: Vercel functions take request bodies up to 4.5 MB.
 * The browser shrinks photos before sending them, so that's rarely a limit.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PDF_PAGES = 5;

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function sniff(bytes: Uint8Array): ImageMedia | "application/pdf" | null {
  const img = sniffImageType(bytes);
  if (img) return img;
  const head = String.fromCharCode(...bytes.slice(0, 6));
  if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) return "image/gif";
  if (head.startsWith("%PDF-")) return "application/pdf";
  return null;
}

/** Roughly how many pages a PDF has: its page objects, not the page tree. */
function pdfPageCount(bytes: Uint8Array): number {
  const text = Buffer.from(bytes).toString("latin1");
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in first.", 401);
  const access = await getStudioAccess(user.id);
  if (!access) return fail("Only the people who run a studio can import a timetable.", 403);
  const { studio } = access;
  if (!claudeConfigured()) return fail("Reading timetable images isn’t switched on yet. Paste your cells or connect a Google Sheet instead.", 503);

  const limit = await checkRateLimit(`import-image:${studio.id}`, 10, 60 * 60_000);
  if (!limit.allowed) return fail("That's a lot of timetables in an hour. Try again a little later.", 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("That upload didn’t come through. Try again.");
  }
  const file = form.get("file");
  if (!file || typeof file === "string" || file.size === 0) return fail("Choose an image or PDF of your timetable.");
  if (file.size > MAX_BYTES) return fail("That file is too big. Try one under 4 MB, or a screenshot.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const media = sniff(bytes);
  if (!media) return fail("Use a JPEG, PNG, WebP or GIF image, or a PDF. (On an iPhone, a screenshot of the photo works.)");
  if (media === "application/pdf" && pdfPageCount(bytes) > MAX_PDF_PAGES) return fail(`That PDF has more than ${MAX_PDF_PAGES} pages. Send just the timetable pages.`);

  const [members, venues, levelNames] = await Promise.all([
    db.studioMember.findMany({ where: { studioId: studio.id, teaches: true }, select: { name: true } }),
    db.venue.findMany({ where: { studioId: studio.id }, select: { name: true } }),
    db.levelName.findMany({ where: { studioId: studio.id }, select: { name: true, scale: true } }),
  ]);

  // The file is kept with the run, so a reading can be checked later.
  const name = (file.name || "timetable").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "timetable";
  const doc = await db.document.create({ data: { filename: name, contentType: media, bytes }, select: { id: true } });
  const source = await db.scheduleSource.create({ data: { kind: "IMAGE", name, studioId: studio.id }, select: { id: true } });

  let result;
  try {
    result = await readTimetable(
      { bytes, media },
      {
        studioName: studio.name,
        teachers: members.map((m) => m.name),
        venues: [studio.name, ...venues.map((v) => v.name)],
        styles: studio.styles.length ? studio.styles : DANCE_STYLES,
        levelNames,
      },
    );
  } catch (err) {
    logError("import.image", err, { studioId: studio.id });
    await db.importRun.create({ data: { sourceId: source.id, documentId: doc.id, status: "FAILED", model: IMPORT_MODEL, error: "exception" } });
    return fail("Something went wrong reading that file. Try again.", 500);
  }

  const run = await db.importRun.create({
    data: {
      sourceId: source.id,
      documentId: doc.id,
      status: result.ok ? "PARSED" : "FAILED",
      model: result.model ?? IMPORT_MODEL,
      inputTokens: result.inputTokens ?? null,
      outputTokens: result.outputTokens ?? null,
      raw: result.ok ? ({ rows: result.rows } as unknown as Prisma.InputJsonValue) : undefined,
      error: result.ok ? null : result.error,
    },
    select: { id: true },
  });
  if (!result.ok) return fail(result.error, 422);
  if (result.rows.length === 0) return fail("No classes were found in that file. Is it a timetable?", 422);
  return NextResponse.json({ ok: true, runId: run.id, name, rows: result.rows });
}
