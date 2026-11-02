"use client";

import { useRef, useState } from "react";
import { fitImageBlob } from "@/lib/image-crop";
import { publicStorageUrl } from "@/lib/storage-url";
import { BLOCK_LABELS, parseVideoUrl, type BlockType, type ContentBlock, type ContentImageResult, type VideoRef } from "@/lib/content-blocks";
import "./content.css";

const IMAGE_MAX_SIDE = 1600;
const IMAGE_MAX_BYTES = 850 * 1024;

// While editing, blocks are loose records (a video is typed as a URL, a list as lines).
type Draft = { t: BlockType; _k: number; [field: string]: unknown };

export type EventOption = { id: string; label: string };

const videoUrl = (v: VideoRef) =>
  v.provider === "youtube" ? `https://youtu.be/${v.id}` : `https://www.twitch.tv/${v.kind === "video" ? `videos/${v.id}` : v.id}`;

function toDraft(b: ContentBlock, k: number): Draft {
  return b.t === "video" ? { t: "video", url: videoUrl(b.video), _k: k } : { ...b, _k: k };
}

/** A textarea with B / I / link buttons that wrap the selected text in **…**, *…* or [..](url). */
function FormattedText({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function wrap(kind: "b" | "i" | "a") {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || (kind === "a" ? "link szövege" : "szöveg");
    let insert: string;
    if (kind === "a") {
      const url = window.prompt("A link címe (https://…)");
      if (!url) return;
      insert = `[${selected}](${url.trim()})`;
    } else {
      const mark = kind === "b" ? "**" : "*";
      insert = `${mark}${selected}${mark}`;
    }
    onChange(value.slice(0, s) + insert + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s, s + insert.length);
    });
  }
  return (
    <div className="ce-fmt">
      <div className="ce-fmt-bar" role="toolbar" aria-label="Formázás">
        <button type="button" onClick={() => wrap("b")} aria-label="Félkövér" title="Félkövér">
          <b>B</b>
        </button>
        <button type="button" onClick={() => wrap("i")} aria-label="Dőlt" title="Dőlt">
          <i>I</i>
        </button>
        <button type="button" onClick={() => wrap("a")} aria-label="Link" title="Link a kijelölt szövegre">
          🔗
        </button>
      </div>
      <textarea ref={ref} className="input" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * The content of an event or news page as blocks that can be added, moved and removed. Only
 * the `allowed` block types are offered. Pictures are shrunk in the browser and uploaded at
 * once; the list goes to the server as JSON in the hidden "body" field with the form.
 */
export function BlocksEditor({
  ownerField,
  ownerId,
  bucket,
  initial,
  allowed,
  upload,
  events = [],
}: {
  ownerField: string;
  ownerId: string;
  bucket: string;
  initial: ContentBlock[];
  allowed: BlockType[];
  upload: (formData: FormData) => Promise<ContentImageResult>;
  events?: EventOption[];
}) {
  const nextKey = useRef(initial.length);
  const [blocks, setBlocks] = useState<Draft[]>(() => initial.map(toDraft));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryTarget = useRef<number | null>(null);

  const add = (b: Omit<Draft, "_k">) => setBlocks((list) => [...list, { ...b, _k: nextKey.current++ } as Draft]);
  const update = (k: number, patch: Record<string, unknown>) => setBlocks((list) => list.map((b) => (b._k === k ? { ...b, ...patch } : b)));
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

  /** Shrinks and uploads pictures; returns their storage paths. */
  async function uploadImages(files: File[]): Promise<string[]> {
    const paths: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Ez nem kép. Válassz JPG, PNG vagy WebP fájlt.");
        continue;
      }
      const blob = await fitImageBlob(file, IMAGE_MAX_SIDE, IMAGE_MAX_BYTES);
      const fd = new FormData();
      fd.append(ownerField, ownerId);
      fd.append("role", "block");
      fd.append("image", blob, blob.type === "image/webp" ? "kep.webp" : "kep.jpg");
      const result = await upload(fd);
      if (result.error || !result.path) setError(result.error ?? "A kép feltöltése nem sikerült.");
      else paths.push(result.path);
    }
    return paths;
  }

  async function onPictures(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const target = galleryTarget.current;
      const paths = await uploadImages([...files]);
      if (target === null) paths.forEach((path) => add({ t: "img", path }));
      else if (target === -1) {
        if (paths.length) add({ t: "gallery", paths });
      } else {
        setBlocks((list) => list.map((b) => (b._k === target ? { ...b, paths: [...((b.paths as string[]) ?? []), ...paths] } : b)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "A kép feltöltése nem sikerült.");
    } finally {
      setBusy(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  function pickPictures(target: number | null, multiple: boolean) {
    galleryTarget.current = target;
    if (imageInput.current) {
      imageInput.current.multiple = multiple;
      imageInput.current.click();
    }
  }

  const url = (path: string) => publicStorageUrl(bucket, path) ?? "";
  // The editor-only key "_k" stays out of what is saved.
  const json = JSON.stringify(blocks, (key, value) => (key === "_k" ? undefined : value));

  const addButtons: [BlockType, () => void][] = [
    ["h", () => add({ t: "h", text: "" })],
    ["p", () => add({ t: "p", text: "" })],
    ["list", () => add({ t: "list", ordered: false, items: [] })],
    ["quote", () => add({ t: "quote", text: "" })],
    ["box", () => add({ t: "box", tone: "info", text: "" })],
    ["img", () => pickPictures(null, false)],
    ["gallery", () => pickPictures(-1, true)],
    ["video", () => add({ t: "video", url: "" })],
    ["link", () => add({ t: "link", url: "" })],
    ["event", () => add({ t: "event", id: events[0]?.id ?? "" })],
    ["hr", () => add({ t: "hr" })],
  ];

  return (
    <div className="space-y-3">
      <input type="hidden" name="body" value={json} />
      {blocks.length === 0 && <p className="muted text-sm">Még nincs tartalom. Adj hozzá blokkokat az alábbi gombokkal.</p>}
      {blocks.map((b, i) => {
        const str = (f: string) => (typeof b[f] === "string" ? (b[f] as string) : "");
        return (
          <div key={b._k} className="ce-block">
            <div className="ce-block-bar">
              <span className="kicker">{BLOCK_LABELS[b.t]}</span>
              <span className="flex gap-1">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(b._k, -1)} disabled={i === 0} aria-label="Feljebb">
                  ↑
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(b._k, 1)} disabled={i === blocks.length - 1} aria-label="Lejjebb">
                  ↓
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBlock(b._k)} aria-label="Blokk törlése">
                  ✕
                </button>
              </span>
            </div>

            {b.t === "h" && <input className="input" value={str("text")} maxLength={200} placeholder="Alcím" onChange={(e) => update(b._k, { text: e.target.value })} />}
            {b.t === "p" && <FormattedText value={str("text")} onChange={(text) => update(b._k, { text })} placeholder="Írd ide a szöveget. Az új sorok megmaradnak." />}
            {b.t === "list" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={b.ordered === true} onChange={(e) => update(b._k, { ordered: e.target.checked })} />
                  Számozott lista
                </label>
                <FormattedText
                  value={((b.items as string[]) ?? []).join("\n")}
                  onChange={(v) => update(b._k, { items: v.split("\n") })}
                  rows={4}
                  placeholder={"Egy sor = egy pont"}
                />
              </div>
            )}
            {b.t === "quote" && (
              <div className="space-y-2">
                <FormattedText value={str("text")} onChange={(text) => update(b._k, { text })} rows={3} placeholder="Az idézet szövege" />
                <input className="input" value={str("by")} maxLength={120} placeholder="Ki mondta? (nem kötelező)" onChange={(e) => update(b._k, { by: e.target.value })} />
              </div>
            )}
            {b.t === "box" && (
              <div className="space-y-2">
                <select className="input" value={b.tone === "warn" ? "warn" : "info"} onChange={(e) => update(b._k, { tone: e.target.value })}>
                  <option value="info">Információ (kék)</option>
                  <option value="warn">Figyelem (sárga)</option>
                </select>
                <FormattedText value={str("text")} onChange={(text) => update(b._k, { text })} rows={2} placeholder="Pl. Határidő: hétfő 12:25" />
              </div>
            )}
            {b.t === "img" && (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
                <img src={url(str("path"))} alt={str("caption")} className="ce-block-img" />
                <input className="input" value={str("caption")} maxLength={300} placeholder="Képaláírás (nem kötelező)" onChange={(e) => update(b._k, { caption: e.target.value })} />
              </div>
            )}
            {b.t === "gallery" && (
              <div className="space-y-2">
                <div className="ce-thumbs">
                  {((b.paths as string[]) ?? []).map((p) => (
                    <span key={p} className="ce-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
                      <img src={url(p)} alt="" />
                      <button
                        type="button"
                        aria-label="Kép eltávolítása"
                        onClick={() => update(b._k, { paths: ((b.paths as string[]) ?? []).filter((x) => x !== p) })}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => pickPictures(b._k, true)} disabled={busy}>
                  + Képek a galériába
                </button>
              </div>
            )}
            {b.t === "video" && (
              <div className="space-y-1">
                <input className="input" type="url" value={str("url")} placeholder="YouTube vagy Twitch link" onChange={(e) => update(b._k, { url: e.target.value })} />
                <p className="muted text-sm">
                  {!str("url")
                    ? "Pl. https://youtu.be/… vagy https://www.twitch.tv/videos/…"
                    : parseVideoUrl(str("url"))
                      ? `✓ ${parseVideoUrl(str("url"))!.provider === "youtube" ? "YouTube" : "Twitch"} videó`
                      : "Ez nem YouTube vagy Twitch link."}
                </p>
              </div>
            )}
            {b.t === "link" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" type="url" required value={str("url")} placeholder="https://…" onChange={(e) => update(b._k, { url: e.target.value })} />
                <input className="input" value={str("label")} maxLength={120} placeholder="Felirat, pl. Nevezés" onChange={(e) => update(b._k, { label: e.target.value })} />
              </div>
            )}
            {b.t === "event" &&
              (events.length ? (
                <select className="input" value={str("id")} onChange={(e) => update(b._k, { id: e.target.value })}>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="muted text-sm">Még nincs esemény az Eseménynaptárban.</p>
              ))}
            {b.t === "hr" && <hr className="ce-hr" />}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {addButtons
          .filter(([t]) => allowed.includes(t))
          .map(([t, onClick]) => (
            <button key={t} type="button" className="btn btn-secondary btn-sm" onClick={onClick} disabled={busy && (t === "img" || t === "gallery")}>
              + {BLOCK_LABELS[t]}
            </button>
          ))}
        {busy && <span className="muted self-center text-sm">Képek feltöltése…</span>}
      </div>
      <input ref={imageInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onPictures(e.target.files)} />
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
