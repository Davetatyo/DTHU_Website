"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RULEBOOK_PATH } from "../lib/pages";
import type { RenderedEntry } from "../lib/content";
import { EntryView } from "./EntryView";

// Szabálytár popups, as on RulePop: a click on any rule, hero or token link opens it over the
// current page and the address bar shows its own link. The entry comes from a static JSON file
// (api/szabalytar/...), fetched once and kept. Opening the same link directly gives a full page.

const loaded = new Map<string, Promise<RenderedEntry>>();

function load(path: string): Promise<RenderedEntry> {
  let p = loaded.get(path);
  if (!p) {
    p = fetch(`/api${RULEBOOK_PATH}/${path}`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<RenderedEntry>;
    });
    p.catch(() => loaded.delete(path));
    loaded.set(path, p);
  }
  return p;
}

const urlOf = (path: string) => `${RULEBOOK_PATH}/${path}`;

export function RulebookViewer({ paths }: { paths: string[] }) {
  const known = useMemo(() => new Set(paths), [paths]);
  const pathname = usePathname();
  const [entry, setEntry] = useState<RenderedEntry | null>(null);
  const page = useRef(pathname); // the page under the popup
  const dialog = useRef<HTMLDivElement>(null);

  /** The entry path of a link or address, if it is one of ours. */
  const entryOf = useCallback(
    (href: string): string | null => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(`${RULEBOOK_PATH}/`)) return null;
      const path = decodeURIComponent(url.pathname.slice(RULEBOOK_PATH.length + 1)).replace(/\/$/, "");
      return known.has(path) ? path : null;
    },
    [known],
  );

  const open = useCallback((path: string, push: boolean) => {
    load(path)
      .then((e) => {
        if (push) window.history.pushState(null, "", urlOf(path));
        setEntry(e);
        dialog.current?.scrollTo(0, 0);
      })
      .catch(() => {
        window.location.href = urlOf(path);
      });
  }, []);

  const close = useCallback(() => {
    window.history.pushState(null, "", page.current);
    setEntry(null);
  }, []);

  // Links to entries open as popups (capture phase, so it also wins over Next's own links).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const path = entryOf(a.href);
      if (!path) return;
      e.preventDefault();
      e.stopPropagation();
      open(path, true);
    }
    // Start loading when the finger or pointer gets near a link, so the popup is instant.
    function onIntent(e: Event) {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const path = a && entryOf(a.href);
      if (path) load(path).catch(() => {});
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("focusin", onIntent);
    };
  }, [entryOf, open]);

  // Back/forward and other navigation: the address decides whether a popup is open.
  useEffect(() => {
    if (entry && pathname === urlOf(entry.path)) return;
    const path = pathname === page.current ? null : entryOf(pathname);
    if (path) {
      open(path, false);
    } else {
      setEntry(null);
      page.current = pathname;
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [entry, close]);

  if (!entry) return null;
  return (
    <div className="rp-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialog} className={`rp-dialog rp-${entry.width}`} role="dialog" aria-modal="true" aria-label={entry.title} tabIndex={-1}>
        <button type="button" className="rp-close" aria-label="Bezárás" onClick={close}>
          <svg viewBox="0 0 50 50" aria-hidden>
            <path d="M0 43.06L18.06 25 .06 7l6.99-7 18 18L43 .06 49.88 7 32 24.94l18.01 18-7 7-18-18L6.93 50 0 43.06z" fill="currentColor" />
          </svg>
        </button>
        <EntryView entry={entry} />
      </div>
    </div>
  );
}
