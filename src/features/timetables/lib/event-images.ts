// Event pictures in Supabase Storage (bucket "event-images", one folder per event), through the
// shared content-image helpers. Server-only; callers (../actions) check admin rights first.

import { deleteUnusedContentImages, storeContentImage } from "@/lib/content-images";
import { EVENT_IMAGE_BUCKET } from "./events";

/** Largest files the server accepts (the browser shrinks pictures well below this). */
export const MAX_COVER_BYTES = 600 * 1024;
export const MAX_BLOCK_IMAGE_BYTES = 900 * 1024;

export function storeEventImage(eventId: string, role: "cover" | "block", bytes: Uint8Array) {
  return storeContentImage(
    EVENT_IMAGE_BUCKET,
    eventId,
    role,
    bytes,
    role === "cover" ? MAX_COVER_BYTES : MAX_BLOCK_IMAGE_BYTES,
    "Lefuttattad a 0003-as adatbázis-frissítést?",
  );
}

export function deleteUnusedEventImages(eventId: string, used: Set<string>): Promise<void> {
  return deleteUnusedContentImages(EVENT_IMAGE_BUCKET, eventId, used);
}
