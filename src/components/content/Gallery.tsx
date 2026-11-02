"use client";

import { useEffect, useRef, useState } from "react";

/** Pictures in a grid; tapping one opens it large, with previous/next and close. */
export function Gallery({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open !== null && !ref.current?.open) ref.current?.showModal();
    if (open === null && ref.current?.open) ref.current.close();
  }, [open]);
  const step = (d: number) => setOpen((i) => (i === null ? i : (i + d + urls.length) % urls.length));

  return (
    <>
      <div className="cb-gallery">
        {urls.map((u, i) => (
          <button key={u} type="button" onClick={() => setOpen(i)} aria-label={`${i + 1}. kép nagyban`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
            <img src={u} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <dialog
        ref={ref}
        className="cb-lightbox"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {open !== null && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
            <img src={urls[open]} alt="" />
            <div className="cb-lightbox-bar">
              {urls.length > 1 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => step(-1)} aria-label="Előző kép">
                  ‹
                </button>
              )}
              <span className="muted text-sm">
                {open + 1} / {urls.length}
              </span>
              {urls.length > 1 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => step(1)} aria-label="Következő kép">
                  ›
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(null)} aria-label="Bezárás">
                ✕
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
