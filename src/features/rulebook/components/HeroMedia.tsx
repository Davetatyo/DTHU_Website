"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { mediaLabel, mediaSrc, mediaThumbSrc, type HeroMediaItem } from "../lib/hero-media";

// Thumbnails in a row share the width by shape, so they all get the same height.
const ROW_HEIGHT = 140;
const MAX_HEIGHT = 300;

/** Full-screen view over the page and any popup: switch pictures (arrows loop), tap to zoom. */
function BigView({ items, start, onClose }: { items: HeroMediaItem[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const item = items[index];

  const show = useCallback((i: number) => {
    setIndex(i);
    setZoomed(false);
  }, []);
  const step = useCallback(
    (by: number) => {
      setIndex((i) => (i + by + items.length) % items.length);
      setZoomed(false);
    },
    [items.length],
  );

  // Load the neighbours in advance, so an arrow click shows the next picture at once.
  useEffect(() => {
    for (const by of [-1, 1]) new Image().src = mediaSrc(items[(index + by + items.length) % items.length]);
  }, [index, items]);

  useEffect(() => {
    // Capture phase: Esc closes only this view, not the popup underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [onClose, step]);

  return createPortal(
    <div className="hm-big" role="dialog" aria-modal="true" aria-label={mediaLabel(item)}>
      <div className="hm-bar">
        <div className="seg2 hm-switch" role="group" aria-label="Kép">
          {items.map((it, i) => (
            <button
              key={it.file}
              type="button"
              aria-pressed={i === index}
              onClick={() => show(i)}
            >
              {mediaLabel(it)}
            </button>
          ))}
        </div>
        <span className="hm-hint">{zoomed ? "Koppints a kicsinyítéshez" : "Koppints a nagyításhoz"}</span>
        <button type="button" className="btn btn-secondary btn-sm hm-close" autoFocus onClick={onClose}>
          Bezárás
        </button>
      </div>
      <div className={`hm-view${zoomed ? " zoomed" : ""}`}>
        <div className="hm-stage">
          {/* eslint-disable-next-line @next/next/no-img-element -- static pictures sized by hand; zoom needs the full file */}
          <img
            key={item.file}
            src={mediaSrc(item)}
            alt={mediaLabel(item)}
            width={item.width}
            height={item.height}
            style={zoomed ? { width: item.width } : undefined}
            onClick={() => setZoomed((z) => !z)}
          />
        </div>
        <button type="button" className="hm-nav prev" aria-label="Előző kép" onClick={() => step(-1)}>
          <span aria-hidden>‹</span>
        </button>
        <button type="button" className="hm-nav next" aria-label="Következő kép" onClick={() => step(1)}>
          <span aria-hidden>›</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** The hero's board and leaflet on a hero page. */
export function HeroMedia({ items }: { items: HeroMediaItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="hm">
      <h3>Hős tábla és kiskönyv</h3>
      <div className="hm-thumbs">
        {items.map((item, i) => {
          const shape = item.width / item.height;
          return (
            <button
              key={item.file}
              type="button"
              className="hm-thumb"
              style={{ flexGrow: shape, flexBasis: shape * ROW_HEIGHT, maxWidth: shape * MAX_HEIGHT }}
              onClick={() => setOpen(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- generated thumbnails, already optimised */}
              <img src={mediaThumbSrc(item)} alt={mediaLabel(item)} width={item.width} height={item.height} loading="lazy" />
              <span>
                {mediaLabel(item)} <i aria-hidden>⤢</i>
              </span>
            </button>
          );
        })}
      </div>
      {open !== null && <BigView items={items} start={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
