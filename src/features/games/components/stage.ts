"use client";

// Shared by the game screens (Taktikai Előny, Kockázat): a host character's typed speech,
// short vibrations, and sizing/centring the stage on the screen below the sticky top bar.

import { useCallback, useEffect, useRef, useState } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduced;
}

/** Types `text` out letter by letter (instantly with reduced motion). */
export function useTyped(text: string, speed: number, reduced: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) return setN(text.length);
    setN(0);
    const t = window.setInterval(() => setN((x) => (x >= text.length ? (window.clearInterval(t), x) : x + 1)), speed);
    return () => window.clearInterval(t);
  }, [text, speed, reduced]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

/** A short vibration on phones that support it (Android). */
export const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
};

/**
 * The stage element fills the screen below the top bar (`--stage-top` for CSS) and is scrolled
 * to the middle when the page opens and whenever `center()` is called.
 */
export function useStage(reduced: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const [topbar, setTopbar] = useState(120);

  const center = useCallback(
    (smooth: boolean) => {
      const el = stage.current;
      if (!el) return;
      const top = (document.querySelector(".topbar") as HTMLElement | null)?.offsetHeight ?? 0;
      const r = el.getBoundingClientRect();
      const y = Math.max(0, window.scrollY + r.top - top - Math.max(0, (window.innerHeight - top - r.height) / 2));
      window.scrollTo({ top: y, behavior: smooth && !reduced ? "smooth" : "auto" });
      // If the smooth scroll was cut short (or the browser skipped it), jump into place.
      window.setTimeout(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (Math.abs(window.scrollY - Math.min(y, max)) > 4) window.scrollTo({ top: y });
      }, 700);
    },
    [reduced],
  );

  // After the page has settled (Next restores the scroll position after navigating, and the
  // pictures load), so the scroll isn't undone.
  useEffect(() => {
    setTopbar((document.querySelector(".topbar") as HTMLElement | null)?.offsetHeight ?? 120);
    const t = window.setTimeout(() => center(true), 450);
    return () => window.clearTimeout(t);
  }, [center]);

  return { stage, center, style: { "--stage-top": `${topbar}px` } as React.CSSProperties };
}
