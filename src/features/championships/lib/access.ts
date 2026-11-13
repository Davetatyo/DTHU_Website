import type { ChampionshipStatus } from "./types";

// Who sees what of a championship (owner's rules, 2026-11-06):
// - upcoming (registration open): everyone sees the sign-ups and can join;
// - running: players in it get the full view, everyone else follows it read-only;
// - finished: only the players who played in it (and admins) can open it, so they can look
//   back at their games against specific opponents; it's of no use to anyone else;
// - draft: admins only.

export type ChampionshipAccess = "signup" | "full" | "readonly" | "hidden";

export function championshipAccess(
  status: ChampionshipStatus,
  viewer: { participant: boolean; admin: boolean },
): ChampionshipAccess {
  switch (status) {
    case "draft":
      return viewer.admin ? "readonly" : "hidden";
    case "registration":
      return "signup";
    case "running":
      return viewer.participant ? "full" : "readonly";
    case "finished":
      return viewer.participant ? "full" : viewer.admin ? "readonly" : "hidden";
  }
}

/** Slugs that are page addresses under /bajnoksagok, so no championship may take them. */
export const RESERVED_SLUGS = ["admin", "osszes", "meccs", "menetrend", "gyik"] as const;

/**
 * Where "Áttekintés" opens: the viewer's running championship (the newest if several), else
 * the one they signed up for, else nothing (the page shows the list of all championships).
 */
export function homeChampionship<T extends { slug: string; status: ChampionshipStatus; created_at: string }>(
  mine: T[],
): T | null {
  const newest = (list: T[]) => [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return newest(mine.filter((t) => t.status === "running")) ?? newest(mine.filter((t) => t.status === "registration"));
}
