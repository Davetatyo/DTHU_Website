"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { routes } from "@/lib/routes";
import "../alchemist.css";

const POPS_ON = (p: string) => p.startsWith(routes.rulebook) || p === routes.faq;

/**
 * The floating "?" vial. Clicking it (or opening the rulebook or the FAQ) brings up the
 * Alchemist, who points to the chat page.
 */
export function HelpVial() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const prev = useRef(path);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = path;
    if (before !== path && POPS_ON(path) && !POPS_ON(before)) {
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, [path]);

  useEffect(() => {
    if (!open) return;
    linkRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (path === routes.alchemist) return null;

  return open ? (
    <div className="alch" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <button className="x" type="button" onClick={() => setOpen(false)} aria-label="Bezárás">
        [x]
      </button>
      <div className="bubble" role="dialog" aria-label="Segítség">
        Ha-haa, látom, kérdésed van!{" "}
        <Link href={routes.alchemist} ref={linkRef} onClick={() => setOpen(false)}>
          Kattints ide
        </Link>
        , ígérem, biztonságos!
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img src="/images/alchemist.webp" alt="Őrült alkimista lila kabátban, kérdőjeles fiolát tart" width={844} height={720} />
    </div>
  ) : (
    <button className="vial" type="button" aria-label="Kérdésed van? Segítség" title="Kérdésed van?" onClick={() => setOpen(true)}>
      <svg viewBox="0 0 58 74" aria-hidden>
        <rect x="21" y="2" width="16" height="13" rx="3" fill="#a5733f" stroke="#1e1726" strokeWidth="2.5" />
        <circle cx="26" cy="7" r="1.3" fill="#6d4622" />
        <circle cx="32" cy="11" r="1.1" fill="#6d4622" />
        <path d="M19 15h20v8c0 2 13 8 13 22v14a12 12 0 0 1-12 12H18A12 12 0 0 1 6 59V45c0-14 13-20 13-22z" fill="#bff3cf" fillOpacity=".55" stroke="#1e1726" strokeWidth="2.5" />
        <path d="M7.5 50h43v9a10.5 10.5 0 0 1-10.5 10.5H18A10.5 10.5 0 0 1 7.5 59z" fill="#5fe07a" fillOpacity=".85" />
        <path d="M14 34h30l1 26H13z" fill="#e9d6a7" stroke="#1e1726" strokeWidth="2" transform="rotate(-4 29 47)" />
        <text x="29" y="56" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="700" fontSize="22" fill="#1e1726" transform="rotate(-4 29 47)">
          ?
        </text>
        <path d="M12 30c2-4 5-6 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
    </button>
  );
}
