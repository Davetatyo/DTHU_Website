"use client";

import { useRouter } from "next/navigation";
import type { ViewMode } from "@/features/match-organizer/lib/view";

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "lista", label: "Lista" },
  { value: "kartyak", label: "Kártyák" },
];

/**
 * Switch between the matchup cards and the compact list. The choice is remembered in a
 * cookie (read by the page on the server, see lib/view.ts) so the page opens the same way next time.
 */
export function ViewToggle({
  current,
  path,
  cookie,
  keep,
}: {
  current: ViewMode;
  path: string;
  cookie: string;
  /** URL parameters to carry over, e.g. the page's active filters. */
  keep?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function choose(value: ViewMode) {
    document.cookie = `${cookie}=${value}; path=/; max-age=31536000; samesite=lax`;
    const query = new URLSearchParams({ nezet: value });
    for (const [k, v] of Object.entries(keep ?? {})) if (v) query.set(k, v);
    router.push(`${path}?${query}`, { scroll: false });
  }

  return (
    <div className="seg2" role="group" aria-label="Nézet">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" onClick={() => choose(o.value)} aria-pressed={o.value === current}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
