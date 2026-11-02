// Taktikai Előny: how the Hadvezér finds the hero you thought of. Pure functions, unit-tested.
//
// Every hero starts equally likely. Each answer makes the heroes that fit more likely and the
// others less likely (not impossible: a player may answer one question wrong). He asks the
// question that splits the remaining likelihood closest to half and half, and guesses when
// one hero is likely enough, or when his questions run out. Owner rules (2026-11-03): at most
// 10 questions and 3 guesses, answers are only yes or no.

import type { Trait } from "./tactician-traits";

export const MAX_QUESTIONS = 10;
export const MAX_GUESSES = 3;
/** How likely a player gives a wrong answer to one question. */
const MISTAKE = 0.1;
/** How sure he must be to guess before his questions run out. */
const SURE = 0.7;

export type GameState = {
  /** Hero id → likelihood (sums to 1 over heroes not yet guessed). */
  weights: Record<string, number>;
  /** Questions asked, with the answers. */
  asked: { trait: string; yes: boolean }[];
  /** Heroes guessed wrong. */
  wrong: string[];
};

export type Move = { kind: "ask"; trait: Trait } | { kind: "guess"; hero: string } | { kind: "give-up" };

export function newGame(heroIds: string[]): GameState {
  return { weights: Object.fromEntries(heroIds.map((id) => [id, 1 / heroIds.length])), asked: [], wrong: [] };
}

function normalise(w: Record<string, number>): Record<string, number> {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  return sum > 0 ? Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / sum])) : w;
}

/** The state after a yes/no answer to a trait. */
export function answer(state: GameState, trait: Trait, yes: boolean): GameState {
  const yesSet = new Set(trait.yes);
  const weights = Object.fromEntries(
    Object.entries(state.weights).map(([id, w]) => [id, w * (yesSet.has(id) === yes ? 1 - MISTAKE : MISTAKE)]),
  );
  return { ...state, weights: normalise(weights), asked: [...state.asked, { trait: trait.id, yes }] };
}

/** The state after a wrong guess: that hero is out. */
export function wrongGuess(state: GameState, hero: string): GameState {
  const weights = { ...state.weights };
  delete weights[hero];
  return { ...state, weights: normalise(weights), wrong: [...state.wrong, hero] };
}

/** Heroes from most to least likely. */
export function ranking(state: GameState): [string, number][] {
  return Object.entries(state.weights).sort((a, b) => b[1] - a[1]);
}

/** How sure he is about his best candidate (0–1), for the "Bizonyosság" bar. */
export const confidence = (state: GameState) => ranking(state)[0]?.[1] ?? 0;

/**
 * His next move. `rand` picks between nearly equally good questions, so games differ.
 */
export function nextMove(state: GameState, traits: Trait[], rand: () => number = Math.random): Move {
  const [top] = ranking(state);
  if (!top || state.wrong.length >= MAX_GUESSES) return { kind: "give-up" };
  const questionsLeft = MAX_QUESTIONS - state.asked.length;
  if (top[1] >= SURE || questionsLeft <= 0) return { kind: "guess", hero: top[0] };

  const asked = new Set(state.asked.map((a) => a.trait));
  const scored = traits
    .filter((t) => !asked.has(t.id))
    .map((t) => {
      const pYes = t.yes.reduce((sum, id) => sum + (state.weights[id] ?? 0), 0);
      return { t, balance: Math.abs(pYes - 0.5) };
    })
    .filter((s) => s.balance < 0.5 - 1e-9)
    .sort((a, b) => a.balance - b.balance);
  if (!scored.length) return { kind: "guess", hero: top[0] };
  const close = scored.filter((s) => s.balance <= scored[0].balance + 0.1);
  return { kind: "ask", trait: close[Math.floor(rand() * close.length)].t };
}
