"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

// Small "?" icon that explains a feature. It opens only after the pointer rests on it for
// HOVER_DELAY_MS, so passing over it by accident shows nothing. Tap (touch screens) and
// keyboard focus open it too; Escape, tapping elsewhere or moving away closes it.

const HOVER_DELAY_MS = 200;
const EDGE_MARGIN_PX = 150;
const SCREEN_GAP_PX = 8;

export function InfoTip({ text, label = "Súgó" }: { text: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const [shift, setShift] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const id = useId();

  // After opening, nudge the bubble so it keeps a small gap from both screen edges.
  useLayoutEffect(() => {
    if (!open || !bubble.current) return;
    const rect = bubble.current.getBoundingClientRect();
    const overRight = rect.right - (window.innerWidth - SCREEN_GAP_PX);
    const overLeft = SCREEN_GAP_PX - rect.left;
    setShift(overRight > 0 ? -overRight : overLeft > 0 ? overLeft : 0);
  }, [open, align]);

  function show() {
    // Keep the bubble on screen when the icon is close to the left or right edge.
    const rect = root.current?.getBoundingClientRect();
    if (rect) {
      setAlign(rect.left < EDGE_MARGIN_PX ? "left" : window.innerWidth - rect.right < EDGE_MARGIN_PX ? "right" : "center");
    }
    setShift(0);
    setOpen(true);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => cancel, []);

  const position =
    align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span
      ref={root}
      className="relative inline-flex align-middle"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        cancel();
        timer.current = setTimeout(show, HOVER_DELAY_MS);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        cancel();
        setOpen(false);
      }}
    >
      <button
        type="button"
        className="info-tip-icon"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        // Only keyboard focus opens it here; a tap or click focuses too, and onClick handles that.
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && (
        <span
          ref={bubble}
          id={id}
          role="tooltip"
          className={`info-tip-bubble ${position}`}
          style={{ transform: `translateX(${shift}px)` }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
