// The real format of an uploaded picture, read from its first bytes, so a renamed file or a
// forged content type can't pass. Shared by every upload (profile pictures, event pictures).

export type ImageType = "image/webp" | "image/jpeg" | "image/png";

export const IMAGE_EXTENSIONS: Record<ImageType, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/** WebP, JPEG or PNG by magic bytes; null for anything else (SVG, GIF, text …). */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const at = (i: number, ...expected: number[]) => expected.every((b, k) => bytes[i + k] === b);
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  return null;
}
