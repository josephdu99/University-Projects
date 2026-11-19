/**
 * Which image format some bytes really are, from their first few bytes.
 *
 * The browser's own `type` for an upload is whatever the client says it is,
 * so it decides nothing. Only JPEG, PNG and WebP are accepted: no SVG, which
 * can carry script, and no formats some browsers can't show.
 */
export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return "image/jpeg";
  }
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((b, i) => at(i) === b)) return "image/png";
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...Array.from(bytes.subarray(from, to)));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}
