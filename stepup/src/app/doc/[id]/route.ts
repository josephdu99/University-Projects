import { db } from "@/lib/db";

/**
 * A studio's uploaded terms (PDF), which students read before they accept
 * them. Checked to start like a PDF when stored; served as a download-safe
 * PDF that can't run anything on this origin.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response(null, { status: 404 });
  const doc = await db.document.findUnique({ where: { id }, select: { contentType: true, bytes: true, filename: true } });
  if (!doc) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(doc.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(doc.bytes.length),
      "Content-Disposition": `inline; filename="${doc.filename.replace(/[^\w.\- ]+/g, "")}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
