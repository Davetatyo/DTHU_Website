"use client";

import { useRef, useState } from "react";
import { fitImageBlob } from "@/lib/image-crop";
import { publicStorageUrl } from "@/lib/storage-url";
import { EVENT_IMAGE_BUCKET, type EventBlock, type EventImageResult } from "../lib/events";
import "../timetables.css";

const IMAGE_MAX_SIDE = 1600;
const IMAGE_MAX_BYTES = 850 * 1024;

type Draft = EventBlock & { _k: number };

const LABELS: Record<EventBlock["t"], string> = { h: "Alcím", p: "Bekezdés", img: "Kép", link: "Link" };

/**
 * The event page's content as simple blocks (heading, paragraph, picture, link) that can be
 * added, moved and removed. The list goes to the server as JSON in the hidden "body" field
 * and is saved with the rest of the form.
 */
export function BlocksEditor({
  eventId,
  initial,
  upload,
}: {
  eventId: string;
  initial: EventBlock[];
  upload: (formData: FormData) => Promise<EventImageResult>;
}) {
  const nextKey = useRef(initial.length);
  const [blocks, setBlocks] = useState<Draft[]>(() => initial.map((b, i) => ({ ...b, _k: i })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const add = (b: EventBlock) => setBlocks((list) => [...list, { ...b, _k: nextKey.current++ } as Draft]);
  const update = (k: number, patch: Partial<EventBlock>) =>
    setBlocks((list) => list.map((b) => (b._k === k ? ({ ...b, ...patch } as Draft) : b)));
  const removeBlock = (k: number) => setBlocks((list) => list.filter((b) => b._k !== k));
  const move = (k: number, dir: -1 | 1) =>
    setBlocks((list) => {
      const i = list.findIndex((b) => b._k === k);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  async function addImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Ez nem kép. Válassz JPG, PNG vagy WebP fájlt.");
    setBusy(true);
    try {
      const blob = await fitImageBlob(file, IMAGE_MAX_SIDE, IMAGE_MAX_BYTES);
      const fd = new FormData();
      fd.append("event_id", eventId);
      fd.append("role", "block");
      fd.append("image", blob, blob.type === "image/webp" ? "kep.webp" : "kep.jpg");
      const result = await upload(fd);
      if (result.error || !result.path) setError(result.error ?? "A kép feltöltése nem sikerült.");
      else add({ t: "img", path: result.path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "A kép feltöltése nem sikerült.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  // The editor-only key "_k" stays out of what is saved.
  const json = JSON.stringify(blocks, (key, value) => (key === "_k" ? undefined : value));

  return (
    <div className="space-y-3">
      <input type="hidden" name="body" value={json} />
      {blocks.length === 0 && <p className="muted text-sm">Még nincs tartalom. Adj hozzá alcímet, bekezdést, képet vagy linket.</p>}
      {blocks.map((b, i) => (
        <div key={b._k} className="ev-block">
          <div className="ev-block-bar">
            <span className="kicker">{LABELS[b.t]}</span>
            <span className="flex gap-1">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(b._k, -1)} disabled={i === 0} aria-label="Feljebb">
                ↑
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => move(b._k, 1)}
                disabled={i === blocks.length - 1}
                aria-label="Lejjebb"
              >
                ↓
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBlock(b._k)} aria-label="Blokk törlése">
                ✕
              </button>
            </span>
          </div>
          {b.t === "h" && (
            <input className="input" value={b.text} maxLength={200} placeholder="Program" onChange={(e) => update(b._k, { text: e.target.value })} />
          )}
          {b.t === "p" && (
            <textarea
              className="input"
              rows={4}
              value={b.text}
              maxLength={5000}
              placeholder="Írd ide a szöveget. Az új sorok megmaradnak."
              onChange={(e) => update(b._k, { text: e.target.value })}
            />
          )}
          {b.t === "img" && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
              <img src={publicStorageUrl(EVENT_IMAGE_BUCKET, b.path) ?? ""} alt={b.caption ?? ""} className="ev-block-img" />
              <input
                className="input"
                value={b.caption ?? ""}
                maxLength={300}
                placeholder="Képaláírás (nem kötelező)"
                onChange={(e) => update(b._k, { caption: e.target.value })}
              />
            </div>
          )}
          {b.t === "link" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="input"
                type="url"
                required
                value={b.url}
                placeholder="https://…"
                onChange={(e) => update(b._k, { url: e.target.value })}
              />
              <input
                className="input"
                value={b.label ?? ""}
                maxLength={120}
                placeholder="Felirat, pl. Nevezés"
                onChange={(e) => update(b._k, { label: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => add({ t: "h", text: "" })}>
          + Alcím
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => add({ t: "p", text: "" })}>
          + Bekezdés
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? "Kép feltöltése…" : "+ Kép"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => add({ t: "link", url: "" })}>
          + Link
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => addImage(e.target.files?.[0])}
      />
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
