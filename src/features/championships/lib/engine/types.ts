export type PlayerId = string;

export interface Participant {
  id: PlayerId;
  seed?: number;
  dropped?: boolean;
}

export interface MatchResult {
  round: number;
  p1: PlayerId;
  p2: PlayerId | null;
  winner: PlayerId | null;
  /** "draw": played with no winner, half a point each. */
  status: "pending" | "played" | "bye" | "forfeit" | "draw";
}

/** Points for a draw (a win is 1). */
export const DRAW_POINTS = 0.5;

export interface Pairing {
  p1: PlayerId;
  p2: PlayerId | null;
  group?: string;
}

export interface BracketMatch {
  key: string;
  bracket: "winners" | "losers" | "final" | "third_place";
  round: number;
  slot: number;
  p1: PlayerId | null;
  p2: PlayerId | null;
  winnerTo?: { key: string; slot: 1 | 2 };
  loserTo?: { key: string; slot: 1 | 2 };
  autoAdvance?: PlayerId;
}

export interface Standing {
  id: PlayerId;
  rank: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  buchholz: number;
  headToHead?: Record<PlayerId, number>;
  gameDiff: number;
}
