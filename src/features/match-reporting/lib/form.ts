import type { GameResultInput } from "./report";
import type { Game, GameSide } from "./types";

// The report form speaks from the viewer's side ("my hero", "I won"); games store sides a / b.
// These convert between the two. Pure, unit-tested.

/** The form's field values, relative to the viewer. outcome: "me" | "opp" | "draw". */
export type RelativeInput = {
  my_hero: string;
  opp_hero: string;
  my_hp: string;
  opp_hp: string;
  my_ult: string;
  opp_ult: string;
  outcome: string;
  played_at: string;
};

export const RELATIVE_FIELDS = ["my_hero", "opp_hero", "my_hp", "opp_hp", "my_ult", "opp_ult", "outcome", "played_at"] as const;

export function readRelative(formData: FormData): RelativeInput {
  const get = (name: string) => String(formData.get(name) ?? "");
  return Object.fromEntries(RELATIVE_FIELDS.map((f) => [f, get(f)])) as RelativeInput;
}

/** Form values → a / b fields for validation, given the viewer's side. */
export function toSideInput(rel: RelativeInput, mySide: GameSide): GameResultInput {
  const mine = mySide === "a";
  const outcome = rel.outcome === "draw" ? "draw" : rel.outcome === "me" ? mySide : rel.outcome === "opp" ? (mine ? "b" : "a") : "";
  return {
    hero_a: mine ? rel.my_hero : rel.opp_hero,
    hero_b: mine ? rel.opp_hero : rel.my_hero,
    hp_a: mine ? rel.my_hp : rel.opp_hp,
    hp_b: mine ? rel.opp_hp : rel.my_hp,
    ult_a: mine ? rel.my_ult : rel.opp_ult,
    ult_b: mine ? rel.opp_ult : rel.my_ult,
    outcome,
    played_at: rel.played_at,
  };
}

/** A game's current version as form values from the viewer's side (to prefill a correction). */
export function fromGame(
  game: Pick<Game, "hero_a" | "hero_b" | "hp_a" | "hp_b" | "ult_a" | "ult_b" | "outcome">,
  mySide: GameSide,
  playedAtWall: string,
): RelativeInput {
  const mine = mySide === "a";
  const str = (n: number | null) => (n === null ? "" : String(n));
  return {
    my_hero: (mine ? game.hero_a : game.hero_b) ?? "",
    opp_hero: (mine ? game.hero_b : game.hero_a) ?? "",
    my_hp: str(mine ? game.hp_a : game.hp_b),
    opp_hp: str(mine ? game.hp_b : game.hp_a),
    my_ult: str(mine ? game.ult_a : game.ult_b),
    opp_ult: str(mine ? game.ult_b : game.ult_a),
    outcome: game.outcome === "draw" ? "draw" : game.outcome === mySide ? "me" : "opp",
    played_at: playedAtWall,
  };
}

/** The game's result from the viewer's side, for lists and the game page. */
export function resultFor(game: Pick<Game, "outcome">, mySide: GameSide | null): "win" | "loss" | "draw" | null {
  if (game.outcome === "draw") return "draw";
  if (!mySide) return null;
  return game.outcome === mySide ? "win" : "loss";
}
