import { db } from "@/lib/db";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export type SavedDocument = { ok: true; id: string } | { ok: false; error: string };

/**
 * Store an uploaded PDF (a studio's own terms), or say why not. The bytes
 * have to start like a PDF; the file name alone proves nothing. An empty or
 * missing file is "no file", which callers decide about.
 */
export async function saveUploadedPdf(value: FormDataEntryValue | null): Promise<SavedDocument | null> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (value.size > MAX_PDF_BYTES) return { ok: false, error: "That PDF is too big. Try one under 5 MB." };
  const bytes = new Uint8Array(await value.arrayBuffer());
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (head !== "%PDF-") return { ok: false, error: "That file isn't a PDF." };
  const filename = (value.name || "terms.pdf").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "terms.pdf";
  const doc = await db.document.create({
    data: { filename, contentType: "application/pdf", bytes },
    select: { id: true },
  });
  return { ok: true, id: doc.id };
}

export function documentUrl(id: string | null | undefined) {
  return id ? `/doc/${id}` : null;
}
