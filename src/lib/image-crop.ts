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

async function compress(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
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

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("A böngésződ nem tudja feldolgozni a képet.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return [canvas, ctx];
}

/**
 * Draws `area` of the picture at `src` onto a width×height canvas and compresses it: WebP where
 * the browser can encode it, JPEG otherwise (older Safari). Lowers the quality step by step
 * until the file fits `maxBytes`. Browsers apply the photo's EXIF rotation when drawing.
 */
export async function cropToBlob(src: string, area: PixelArea, width: number, height: number, maxBytes: number): Promise<Blob> {
  const img = await loadImage(src);
  const [canvas, ctx] = canvasOf(width, height);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);
  return compress(canvas, maxBytes);
}

/** Square crop (profile pictures). */
export function cropToSquareBlob(src: string, area: PixelArea, size: number, maxBytes: number): Promise<Blob> {
  return cropToBlob(src, area, size, size, maxBytes);
}

/** The whole picture, shrunk so its longer side is at most `maxSide` px (pictures in articles). */
export async function fitImageBlob(file: File, maxSide: number, maxBytes: number): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const [canvas, ctx] = canvasOf(width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return await compress(canvas, maxBytes);
  } finally {
    URL.revokeObjectURL(src);
  }
}
