import { checkResult } from "@/lib/game-result";
import { wallTimeToUtc } from "@/features/match-organizer/lib/time";
import type { Game, GameFields, StandaloneContext } from "./types";

// Checks a standalone game's form (new report, correction, admin edit) before it goes to the
// game_* functions. The same limits are enforced again by the database (migration 0014).

export const MAX_ULTIMATES = 20;
/** How far back a game may be dated, counted from when it was first reported. */
export const BACKDATE_DAYS = 7;
/** Clock difference allowed for "now" (the database allows the same). */
const FUTURE_SLACK_MS = 5 * 60_000;

export type GameResultInput = {
  hero_a: string;
  hero_b: string;
  hp_a: string;
  hp_b: string;
  ult_a: string;
  ult_b: string;
  outcome: string;
  /** `datetime-local` value in the viewer's time zone, e.g. "2026-11-14T20:30". */
  played_at: string;
};

export type NewGameInput = GameResultInput & { context: string; opponent_id: string };

type Options = {
  heroNames: readonly string[];
  timeZone: string;
  now: Date;
  /** When the game was first reported (corrections, admin edits); a new report uses `now`. */
  since?: Date;
};

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** Optional ultimates count: empty = not recorded, otherwise a whole number 0–20. */
function parseUltimates(raw: string): number | null | undefined {
  const s = raw.trim();
  if (s === "") return null;
  if (!/^\d{1,2}$/.test(s)) return undefined;
  const n = Number(s);
  return n <= MAX_ULTIMATES ? n : undefined;
}

/** The result fields: heroes from the hero list, outcome + health, optional ultimates, date. */
export function validateGameResult(input: GameResultInput, opts: Options): Checked<GameFields> {
  const hero_a = input.hero_a.trim();
  const hero_b = input.hero_b.trim();
  if (!opts.heroNames.includes(hero_a) || !opts.heroNames.includes(hero_b)) {
    return { ok: false, error: "Mindkét játékosnál válaszd ki a hőst a listából." };
  }

  const result = checkResult(input.outcome, input.hp_a, input.hp_b);
  if (!result.ok) return result;

  const ult_a = parseUltimates(input.ult_a);
  const ult_b = parseUltimates(input.ult_b);
  if (ult_a === undefined || ult_b === undefined) {
    return { ok: false, error: `Az ultik száma 0 és ${MAX_ULTIMATES} közötti egész szám legyen (vagy hagyd üresen).` };
  }

  let played: Date;
  try {
    played = wallTimeToUtc(input.played_at.trim(), opts.timeZone);
  } catch {
    return { ok: false, error: "Add meg, mikor játszottátok." };
  }
  const since = opts.since ?? opts.now;
  if (played.getTime() < since.getTime() - BACKDATE_DAYS * 86_400_000) {
    return { ok: false, error: `Legfeljebb ${BACKDATE_DAYS} nappal korábbi játszmát lehet rögzíteni.` };
  }
  if (played.getTime() > opts.now.getTime() + FUTURE_SLACK_MS) {
    return { ok: false, error: "A játszma időpontja nem lehet a jövőben." };
  }

  return {
    ok: true,
    value: { hero_a, hero_b, hp_a: result.hp_a, hp_b: result.hp_b, ult_a, ult_b, outcome: result.outcome, played_at: played.toISOString() },
  };
}

/** A new report: casual or ranked, an opponent who isn't the reporter, and a valid result. */
export function validateNewGame(
  input: NewGameInput,
  reporterId: string,
  opts: Options,
): Checked<{ context: StandaloneContext; opponentId: string; fields: GameFields }> {
  const context = input.context;
  if (context !== "casual" && context !== "ranked") return { ok: false, error: "Válaszd ki, hogy casual vagy ranked játszma volt." };
  const opponentId = input.opponent_id.trim();
  if (!opponentId) return { ok: false, error: "Válaszd ki az ellenfeledet." };
  if (opponentId === reporterId) return { ok: false, error: "Saját magaddal nem rögzíthetsz játszmát." };
  const result = validateGameResult(input, { ...opts, since: undefined });
  if (!result.ok) return result;
  return { ok: true, value: { context, opponentId, fields: result.value } };
}

/** Same result as the game's current version (sending it back counts as confirming). */
export function sameResult(game: Pick<Game, keyof GameFields>, fields: GameFields): boolean {
  return (
    game.hero_a === fields.hero_a &&
    game.hero_b === fields.hero_b &&
    game.hp_a === fields.hp_a &&
    game.hp_b === fields.hp_b &&
    game.ult_a === fields.ult_a &&
    game.ult_b === fields.ult_b &&
    game.outcome === fields.outcome &&
    new Date(game.played_at).getTime() === new Date(fields.played_at).getTime()
  );
}
