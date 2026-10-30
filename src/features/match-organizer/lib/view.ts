/** How a round's matches are shown: matchup cards or the compact list. */
export type ViewMode = "kartyak" | "lista";

/** Picks the view from the URL, then the remembered cookie, then the page's default. */
export function resolveView(param: string | undefined, remembered: string | undefined, fallback: ViewMode): ViewMode {
  for (const v of [param, remembered]) if (v === "kartyak" || v === "lista") return v;
  return fallback;
}
