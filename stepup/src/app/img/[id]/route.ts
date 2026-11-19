import { db } from "@/lib/db";

/**
 * Uploaded studio and teacher photos.
 *
 * The bytes were checked to be a JPEG, PNG or WebP when they were stored, and
 * the response still pins the type, forbids sniffing and allows nothing to
 * run, so a file that somehow isn't an image can't become a page on this
 * origin. A new upload gets a new id, so a URL's contents never change and
 * browsers may keep them for a year.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response(null, { status: 404 });

  const image = await db.image.findUnique({
    where: { id },
    select: { contentType: true, bytes: true },
  });
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
