// Profile pictures: rules shared by the upload form, the server actions and the display.
// Pure functions only (no database, no server-only imports), so they can be unit-tested and
// used in the browser too. Who may upload is in ./access.ts.

import { AVATAR_BUCKET, avatarPublicUrl } from "@/lib/avatar-url";
import { IMAGE_EXTENSIONS, sniffImageType, type ImageType } from "@/lib/image-type";

// The bucket, the public URL and the format check are site-wide (header, event pictures).
export { AVATAR_BUCKET, avatarPublicUrl, sniffImageType, type ImageType };

/** The browser crops and shrinks every picture to this square size (px) before uploading. */
export const AVATAR_SIZE = 512;

/** Largest picture a user may pick on their device, before shrinking. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Largest file the server accepts after shrinking (the bucket enforces the same limit). */
export const MAX_UPLOAD_BYTES = 300 * 1024;

/** What the avatar actions return to the AvatarEditor, which shows the error itself. */
export type AvatarResult = { error: string | null };

/**
 * Where a new picture is stored: one folder per user, a new file name on every upload so
 * browsers and the CDN never show an old cached picture.
 */
export function avatarObjectPath(userId: string, type: ImageType, now: Date = new Date()): string {
  return `${userId}/${now.getTime()}.${IMAGE_EXTENSIONS[type]}`;
}

/** Checks an uploaded (already shrunk) picture. Returns its format, or a Hungarian error. */
export function checkAvatarFile(bytes: Uint8Array): { ok: true; type: ImageType } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "Nem érkezett kép." };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: "A kép túl nagy. Próbáld újra, vagy válassz másik képet." };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "Ez nem kép, vagy nem támogatott formátum (JPG, PNG vagy WebP)." };
  return { ok: true, type };
}
