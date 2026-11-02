// Browser-side image shrinking: cut a square out of a picture and compress it before upload,
// so a 12 MB phone photo never leaves the device at full size. Shared by every feature that
// uploads pictures (profile avatars now; news and event cards later).

export type PixelArea = { x: number; y: number; width: number; height: number };

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("A kép nem tölthető be."));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Draws `area` of the picture at `src` onto a size×size canvas and compresses it: WebP where
 * the browser can encode it, JPEG otherwise (older Safari). Lowers the quality step by step
 * until the file fits `maxBytes`. Browsers apply the photo's EXIF rotation when drawing.
 */
export async function cropToSquareBlob(src: string, area: PixelArea, size: number, maxBytes: number): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("A böngésződ nem tudja feldolgozni a képet.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);

  let last: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob) break;
    last = blob;
    if (blob.size <= maxBytes) return blob;
  }
  if (!last) throw new Error("A kép tömörítése nem sikerült.");
  return last;
}
