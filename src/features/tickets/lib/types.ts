// Rows of the tables in supabase/migrations/0007_ticket_draws.sql.

export type LedgerKind = "award" | "draw_entry" | "draw_refund";

export type LedgerRow = {
  id: string;
  profile_id: string;
  amount: number;
  kind: LedgerKind;
  reason: string;
  draw_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type DrawStatus = "open" | "drawn" | "cancelled";

export type Draw = {
  id: string;
  title: string;
  prize: string;
  description: string | null;
  closes_at: string;
  winner_count: number;
  max_tickets_per_player: number | null;
  status: DrawStatus;
  drawn_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type DrawEntryRow = { draw_id: string; profile_id: string; tickets: number; created_at: string; updated_at: string };

export type WinnerRow = { draw_id: string; place: number; profile_id: string };

/** What a draw card shows (built by lib/stats.ts). */
export type DrawStats = {
  entrants: number;
  tickets: number;
  /** The viewer's tickets in this draw (0 when anonymous or not entered). */
  mine: number;
  /** Winner names in place order (only for drawn draws). */
  winners: string[];
  /** The viewer is one of the winners. */
  iWon: boolean;
};
