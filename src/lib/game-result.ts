// The result of one Dice Throne game: who won (or a draw) and both players' final health.
// Shared by Bajnokságok results (championships) and standalone games (match-reporting), and
// mirrored by the games table's checks (migration 0014).

/** Side 'a' / 'b' of a game, or a draw. */
export type GameOutcome = "a" | "b" | "draw";

export const MAX_HP = 99;

const OUTCOMES: readonly string[] = ["a", "b", "draw"];

/** A whole number 0–99 from a form field, or null. */
export function parseHp(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  return n <= MAX_HP ? n : null;
}

/**
 * Checks the outcome and both players' health. A winner can't finish on 0 health (both on 0 is a
 * draw); the loser may have health left (a conceded game).
 */
export function checkResult(
  outcomeRaw: string,
  hpARaw: string,
  hpBRaw: string,
): { ok: true; outcome: GameOutcome; hp_a: number; hp_b: number } | { ok: false; error: string } {
  if (!OUTCOMES.includes(outcomeRaw)) return { ok: false, error: "Válaszd ki a győztest vagy a döntetlent." };
  const outcome = outcomeRaw as GameOutcome;
  const hp_a = parseHp(hpARaw);
  const hp_b = parseHp(hpBRaw);
  if (hp_a === null || hp_b === null) return { ok: false, error: `Az életerő 0 és ${MAX_HP} közötti egész szám legyen.` };
  if ((outcome === "a" && hp_a === 0) || (outcome === "b" && hp_b === 0)) {
    return { ok: false, error: "A győztes nem végezhet 0 életerővel. Ha mindketten 0-n álltok, az döntetlen." };
  }
  return { ok: true, outcome, hp_a, hp_b };
}
