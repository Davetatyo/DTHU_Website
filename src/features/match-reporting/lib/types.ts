// Games (public.games, migration 0014): one row per real game. Standalone games (casual, ranked)
// are reported and confirmed here; championship games are copied from locked Bajnokságok results.
// Side 'a' / 'b' = profile_a / profile_b; a standalone game's reporter is side a.

import type { GameOutcome } from "@/lib/game-result";

export type GameContext = "casual" | "ranked" | "tournament";
export type StandaloneContext = Exclude<GameContext, "tournament">;
export type GameStatus = "pending" | "finalized" | "cancelled" | "expired" | "voided";
export type GameSource = "web" | "discord" | "admin";
export type GameSide = "a" | "b";

export type Game = {
  id: string;
  context: GameContext;
  rated: boolean;
  source: GameSource;
  status: GameStatus;
  profile_a: string;
  profile_b: string;
  hero_a: string | null;
  hero_b: string | null;
  hp_a: number;
  hp_b: number;
  ult_a: number | null;
  ult_b: number | null;
  ban_a: string | null;
  ban_b: string | null;
  outcome: GameOutcome;
  played_at: string;
  match_id: string | null;
  tournament_id: string | null;
  reported_side: GameSide | "admin";
  reported_by: string | null;
  reported_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  reminders_sent: number;
  created_at: string;
  updated_at: string;
};

/** A game's result as the game_* functions take it (p_fields). played_at is an ISO time. */
export type GameFields = {
  hero_a: string;
  hero_b: string;
  hp_a: number;
  hp_b: number;
  ult_a: number | null;
  ult_b: number | null;
  outcome: GameOutcome;
  played_at: string;
};
