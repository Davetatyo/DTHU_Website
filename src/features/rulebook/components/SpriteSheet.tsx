"use client";

import { useEffect, useRef } from "react";

let sheet: Promise<string> | null = null;

/**
 * RulePop's icon sheet (dice, CP, damage, status effects…; public/szabalytar/sprites.svg,
 * 285 KB with pictures inside), loaded once after the page and cached by the browser. The
 * content's <svg><use href="#se-burn"/></svg> icons draw from it, as on RulePop.
 */
export function SpriteSheet() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheet ??= fetch("/szabalytar/sprites.svg").then((r) => (r.ok ? r.text() : ""));
    sheet.then((svg) => {
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, []);
  return <div ref={ref} className="rp-sprites" aria-hidden />;
}
