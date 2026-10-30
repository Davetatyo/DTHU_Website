export type MatchStatus = "pending" | "proposed" | "confirmed" | "played" | "bye";

export type { Profile } from "@/lib/types";

export type Tournament = { id: string; name: string; is_active: boolean; created_at: string };

export type Player = { id: string; tournament_id: string; karnyx_name: string; heroes: string[] };

export type Round = {
  id: string;
  tournament_id: string;
  number: number;
  starts_at: string;
  deadline: string;
  closed_at: string | null;
  completed_at: string | null;
  deadline_warning_sent: boolean;
};

export type Match = {
  id: string;
  round_id: string;
  table_no: number;
  player_a_id: string;
  player_b_id: string | null;
  status: MatchStatus;
  scheduled_at: string | null;
  played_at: string | null;
  reminder_sent: boolean;
};

/** A match joined with its players and round, as most pages need it. */
export type MatchView = Match & { a: Player; b: Player | null; round: Round };

export type Proposal = {
  id: string;
  match_id: string;
  proposed_by: string | null;
  starts_at: string;
  status: "open" | "accepted" | "declined" | "superseded";
  created_at: string;
};
