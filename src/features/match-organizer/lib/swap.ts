// Rules for an admin replacing one player of a match with another player.

import type { MatchStatus } from "./types";

export type SwapSlot = "a" | "b";

export type SwapMatch = {
  id: string;
  table_no: number;
  player_a_id: string;
  player_b_id: string | null;
  status: MatchStatus;
};

export type SwapPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      /** Player being replaced. */
      replacedId: string;
      /** The new player's Bye in this round, removed because they now play. */
      removeByeMatchId: string | null;
      /** Give the replaced player a Bye (admin's choice). */
      addByeFor: string | null;
      /** Table number for that new Bye, after all existing ones. */
      nextTableNo: number;
    };

export function planSwap(
  roundMatches: SwapMatch[],
  matchId: string,
  slot: SwapSlot,
  newPlayerId: string,
  giveReplacedBye: boolean,
): SwapPlan {
  const match = roundMatches.find((m) => m.id === matchId);
  if (!match) return { ok: false, error: "A meccs nem található ebben a fordulóban." };
  if (match.status === "bye") return { ok: false, error: "Bye meccsen nincs kit cserélni." };
  if (match.status === "played") return { ok: false, error: "Lejátszott meccsen nem lehet játékost cserélni." };

  const replacedId = slot === "a" ? match.player_a_id : match.player_b_id;
  const otherId = slot === "a" ? match.player_b_id : match.player_a_id;
  if (!replacedId) return { ok: false, error: "Ezen a helyen nincs játékos." };
  if (newPlayerId === replacedId) return { ok: false, error: "Ez ugyanaz a játékos." };
  if (newPlayerId === otherId) return { ok: false, error: "A játékos nem játszhat saját maga ellen." };

  // The new player may currently rest (Bye) in this round, but must not have a real match.
  const elsewhere = roundMatches.find(
    (m) => m.id !== matchId && (m.player_a_id === newPlayerId || m.player_b_id === newPlayerId),
  );
  if (elsewhere && elsewhere.status !== "bye") {
    return { ok: false, error: `Ez a játékos már játszik ebben a fordulóban (${elsewhere.table_no}. asztal).` };
  }

  return {
    ok: true,
    replacedId,
    removeByeMatchId: elsewhere?.id ?? null,
    addByeFor: giveReplacedBye ? replacedId : null,
    nextTableNo: Math.max(0, ...roundMatches.map((m) => m.table_no)) + 1,
  };
}
