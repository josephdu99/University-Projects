import { db } from "@/lib/db";
import { MAX_IMAGE_BYTES, sniffImageType } from "@/lib/image-type";

export type SavedImage = { ok: true; id: string } | { ok: false; error: string };

/**
 * Store an uploaded photo, or say why not. An empty or missing file is "no
 * photo", which callers treat as fine.
 */
export async function saveUploadedImage(
  value: FormDataEntryValue | null,
): Promise<SavedImage | null> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (value.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "That photo is too big. Try one under 2 MB." };
  }
  const bytes = new Uint8Array(await value.arrayBuffer());
  const contentType = sniffImageType(bytes);
  if (!contentType) {
    return { ok: false, error: "Use a JPEG, PNG or WebP photo." };
  }
  const image = await db.image.create({
    data: { contentType, bytes },
    select: { id: true },
  });
  return { ok: true, id: image.id };
}

/** Public URL of a stored image. Ids are never reused, so it never changes. */
export function imageUrl(id: string | null | undefined): string | null {
  return id ? `/img/${id}` : null;
}
