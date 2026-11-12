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
  /** "draw": played with no winner. */
  status: "pending" | "played" | "bye" | "forfeit" | "draw";
  /** Health each player finished on (from the result report), for the HP tiebreaker. */
  hpA?: number;
  hpB?: number;
}

/** Points per result, set by an admin per championship. Multiples of 0.5. */
export interface Scoring {
  win: number;
  draw: number;
  loss: number;
  bye: number;
}

/** Until an admin changes it: win 1, draw ½, loss 0, Bye counts as a win. */
export const DEFAULT_SCORING: Scoring = { win: 1, draw: 0.5, loss: 0, bye: 1 };

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
  /** Buchholz: all opponents' points; a Bye counts as an opponent with the player's own points. */
  buchholz: number;
  /** HP difference: + the HP you won with, − the HP your opponent beat you with; draws and Byes 0. */
  hpDiff: number;
  headToHead?: Record<PlayerId, number>;
}
