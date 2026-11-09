// Bajnokságok types. A championship is a row in public.tournaments (format other than
// "manual", migration 0013); its rounds, matches and players use the Időpontfoglaló's tables,
// so players agree on match times on the Időpontfoglaló's match page.

import type { MatchView, Player, Round } from "@/features/match-organizer/lib/types";

export type { Player, Round };

export type ChampionshipFormat = "swiss" | "round_robin" | "single_elimination" | "double_elimination" | "groups_playoffs";

export type ChampionshipStatus = "draft" | "registration" | "running" | "finished";

/** tournaments.settings. Swiss only for now; other formats will add their own fields. */
export type ChampionshipSettings = {
  /** Number of Swiss rounds (default: enough to find a winner, see defaultSwissRounds). */
  rounds?: number;
  /** Days each automatically created round lasts (deadline = round start + this). */
  round_days?: number;
};

export type Championship = {
  id: string;
  name: string;
  slug: string;
  format: ChampionshipFormat;
  status: ChampionshipStatus;
  best_of: number;
  settings: ChampionshipSettings;
  starts_at: string | null;
  auto_pairing: boolean;
  created_at: string;
};

/** A match with its result (winner_id / is_draw, migration 0013). */
export type ChampionshipMatch = MatchView & { winner_id?: string | null; is_draw?: boolean };

export type ReportOutcome = "a" | "b" | "draw";
type ReportSide = "a" | "b" | "admin";

/** The current result report of a match (public.match_reports). confirmed_at set = locked. */
export type MatchReport = {
  match_id: string;
  outcome: ReportOutcome;
  hp_a: number;
  hp_b: number;
  pick_a: string | null;
  pick_b: string | null;
  ban_a: string | null;
  ban_b: string | null;
  submitted_side: ReportSide;
  submitted_by: string | null;
  submitted_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
};

export type Registration = {
  tournament_id: string;
  profile_id: string;
  karnyx_name: string;
  heroes: string[];
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};
