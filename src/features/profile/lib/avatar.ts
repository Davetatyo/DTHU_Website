// Profile pictures: rules shared by the upload form, the server actions and the display.
// Pure functions only (no database, no server-only imports), so they can be unit-tested and
// used in the browser too. Who may upload is in ./access.ts.

import { AVATAR_BUCKET, avatarPublicUrl } from "@/lib/avatar-url";

// The bucket and the public URL are site-wide (the header shows the picture too).
export { AVATAR_BUCKET, avatarPublicUrl };

/** The browser crops and shrinks every picture to this square size (px) before uploading. */
export const AVATAR_SIZE = 512;

/** Largest picture a user may pick on their device, before shrinking. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Largest file the server accepts after shrinking (the bucket enforces the same limit). */
export const MAX_UPLOAD_BYTES = 300 * 1024;

/** What the avatar actions return to the AvatarEditor, which shows the error itself. */
export type AvatarResult = { error: string | null };

export type ImageType = "image/webp" | "image/jpeg" | "image/png";

/**
 * The real format of an uploaded file, read from its first bytes (a renamed file or a
 * forged content type doesn't pass). Null when it isn't a WebP, JPEG or PNG image.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const at = (i: number, ...expected: number[]) => expected.every((b, k) => bytes[i + k] === b);
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  return null;
}

const EXTENSIONS: Record<ImageType, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/**
 * Where a new picture is stored: one folder per user, a new file name on every upload so
 * browsers and the CDN never show an old cached picture.
 */
export function avatarObjectPath(userId: string, type: ImageType, now: Date = new Date()): string {
  return `${userId}/${now.getTime()}.${EXTENSIONS[type]}`;
}

/** Checks an uploaded (already shrunk) picture. Returns its format, or a Hungarian error. */
export function checkAvatarFile(bytes: Uint8Array): { ok: true; type: ImageType } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "Nem érkezett kép." };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: "A kép túl nagy. Próbáld újra, vagy válassz másik képet." };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "Ez nem kép, vagy nem támogatott formátum (JPG, PNG vagy WebP)." };
  return { ok: true, type };
}
