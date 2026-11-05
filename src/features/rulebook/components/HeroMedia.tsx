"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { mediaLabel, mediaSrc, mediaThumbSrc, type HeroMediaItem } from "../lib/hero-media";

// Thumbnails in a row share the width by shape, so they all get the same height.
const ROW_HEIGHT = 140;
const MAX_HEIGHT = 300;

/** Full-screen view over the page and any popup: switch pictures, tap to zoom to full size. */
function BigView({ items, start, onClose }: { items: HeroMediaItem[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const item = items[index];

  useEffect(() => {
    // Capture phase: Esc closes only this view, not the popup underneath.
    const onKey = (e: KeyboardEvent) => {
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
  }, [onClose]);

  return createPortal(
    <div className="hm-big" role="dialog" aria-modal="true" aria-label={mediaLabel(item)}>
      <div className="hm-bar">
        <div className="seg2 hm-switch" role="group" aria-label="Kép">
          {items.map((it, i) => (
            <button
              key={it.file}
              type="button"
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i);
                setZoomed(false);
              }}
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
      <div className={`hm-stage${zoomed ? " zoomed" : ""}`}>
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
