"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { UserIcon } from "@/components/icons";
import { cropToSquareBlob } from "@/lib/image-crop";
import { AVATAR_SIZE, MAX_SOURCE_BYTES, MAX_UPLOAD_BYTES, type AvatarResult } from "@/features/profile/lib/avatar";
import "../profile.css";

/**
 * Profile picture with upload, crop and delete. The user picks a photo, moves and zooms it
 * inside the round frame, and on "Mentés" the browser cuts out the square, shrinks it to
 * AVATAR_SIZE px and uploads only that. Used on Profilom (own picture) and on the admin
 * "Profil szerkesztése" page (profileId set, admin actions).
 */
export function AvatarEditor({
  currentUrl,
  upload,
  remove,
  profileId,
}: {
  currentUrl: string | null;
  upload: (formData: FormData) => Promise<AvatarResult>;
  remove: (formData: FormData) => Promise<AvatarResult>;
  profileId?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Free the picked photo's memory when it's replaced or the editor closes.
  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Ez nem kép. Válassz JPG, PNG vagy WebP fájlt.");
    if (file.size > MAX_SOURCE_BYTES) return setError("A kép túl nagy (legfeljebb 15 MB).");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSrc(URL.createObjectURL(file));
  }

  function close() {
    setSrc(null);
    setArea(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function formData(): FormData {
    const fd = new FormData();
    if (profileId) fd.append("profile_id", profileId);
    return fd;
  }

  function save() {
    if (!src || !area) return;
    startTransition(async () => {
      setError(null);
      try {
        const blob = await cropToSquareBlob(src, area, AVATAR_SIZE, MAX_UPLOAD_BYTES);
        const fd = formData();
        fd.append("avatar", blob, blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
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
    if (!window.confirm("Biztosan törlöd a profilképet?")) return;
    startTransition(async () => {
      setError(null);
      const result = await remove(formData());
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small picture from Supabase Storage
          <img src={currentUrl} alt="Profilkép" className="avatar-photo" width={84} height={84} />
        ) : (
          <span className="avatar-photo avatar-empty" aria-label="Nincs profilkép">
            <UserIcon />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()} disabled={pending}>
              {currentUrl ? "Csere" : "Kép feltöltése"}
            </button>
            {currentUrl && !src && (
              <button type="button" className="btn btn-danger btn-sm" onClick={del} disabled={pending}>
                Törlés
              </button>
            )}
          </div>
          <p className="muted mt-2 text-sm">JPG, PNG vagy WebP, legfeljebb 15 MB. Feltöltés előtt körbevághatod.</p>
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
      </div>

      {src && (
        <div className="avatar-crop mt-4">
          <p className="label">Igazítsd a képet a keretbe</p>
          <div className="avatar-crop-stage">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          </div>
          <p className="muted mt-2 text-sm">Húzd a képet a mozgatáshoz. Nagyíts a csúszkával, görgővel vagy két ujjal.</p>
          <label className="mt-2 flex items-center gap-3">
            <span className="muted text-sm">Nagyítás</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="avatar-zoom"
              aria-label="Nagyítás"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn" onClick={save} disabled={pending || !area}>
              {pending ? "Mentés…" : "Mentés"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={close} disabled={pending}>
              Mégse
            </button>
          </div>
        </div>
      )}

      {error && <p className="alert-error mt-3">{error}</p>}
    </div>
  );
}
