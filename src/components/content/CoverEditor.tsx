"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { cropToBlob } from "@/lib/image-crop";
import type { ContentImageResult } from "@/lib/content-blocks";
import "./content.css";

const WIDTH = 1280;
const HEIGHT = 720;
const MAX_BYTES = 550 * 1024;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * The card picture of an event or news item: pick a photo, frame it in the 16:9 card shape,
 * and the browser shrinks it to 1280×720 before uploading. Saved on the item right away.
 * `ownerField` / `ownerId` tell the upload action which item it is (e.g. "event_id").
 */
export function CoverEditor({
  ownerField,
  ownerId,
  currentUrl,
  emptyText,
  upload,
  remove,
}: {
  ownerField: string;
  ownerId: string;
  currentUrl: string | null;
  emptyText: string;
  upload: (formData: FormData) => Promise<ContentImageResult>;
  remove: (formData: FormData) => Promise<ContentImageResult>;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Ez nem kép. Válassz JPG, PNG vagy WebP fájlt.");
    if (file.size > MAX_SOURCE_BYTES) return setError("A kép túl nagy (legfeljebb 20 MB).");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSrc(URL.createObjectURL(file));
  }

  function close() {
    setSrc(null);
    setArea(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function form(): FormData {
    const fd = new FormData();
    fd.append(ownerField, ownerId);
    fd.append("role", "cover");
    return fd;
  }

  function save() {
    if (!src || !area) return;
    startTransition(async () => {
      setError(null);
      try {
        const blob = await cropToBlob(src, area, WIDTH, HEIGHT, MAX_BYTES);
        const fd = form();
        fd.append("image", blob, blob.type === "image/webp" ? "cover.webp" : "cover.jpg");
        const result = await upload(fd);
        if (result.error) return setError(result.error);
        close();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "A kép mentése nem sikerült, próbáld újra.");
      }
    });
  }

  function del() {
    if (!window.confirm("Biztosan törlöd a kártya képét?")) return;
    startTransition(async () => {
      const result = await remove(form());
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage
        <img src={currentUrl} alt="Kártya kép" className="ce-cover-preview" width={WIDTH} height={HEIGHT} />
      ) : (
        <p className="muted text-sm">{emptyText}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()} disabled={pending}>
          {currentUrl ? "Kép cseréje" : "Kép feltöltése"}
        </button>
        {currentUrl && !src && (
          <button type="button" className="btn btn-danger btn-sm" onClick={del} disabled={pending}>
            Kép törlése
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {src && (
        <div className="ce-crop">
          <p className="label">Igazítsd a képet a kártya keretébe</p>
          <div className="ce-crop-stage">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={WIDTH / HEIGHT}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          </div>
          <label className="mt-2 flex items-center gap-3">
            <span className="muted text-sm">Nagyítás</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="ce-zoom"
              aria-label="Nagyítás"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn" onClick={save} disabled={pending || !area}>
              {pending ? "Mentés…" : "Kép mentése"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={close} disabled={pending}>
              Mégse
            </button>
          </div>
        </div>
      )}
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
