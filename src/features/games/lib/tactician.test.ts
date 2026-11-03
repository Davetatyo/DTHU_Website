import { describe, expect, it } from "vitest";
import { tacticianData } from "./tactician-data";
import { answer, answered, MAX_GUESSES, MAX_QUESTIONS, newGame, nextMove, wrongGuess, type GameState } from "./tactician";
import type { Trait } from "./tactician-traits";

const { heroes, traits } = tacticianData();
const ids = heroes.map((h) => h.id);

/** Plays a whole game for `hero`; `lie` flips the answer to the n-th question. */
function play(hero: string, opts: { lie?: number; rand?: () => number } = {}): { won: boolean; questions: number; guesses: number } {
  let state: GameState = newGame(ids);
  const rand = opts.rand ?? (() => 0);
  for (let step = 0; step < 40; step++) {
    const move = nextMove(state, traits, rand);
    if (move.kind === "give-up") return { won: false, questions: state.asked.length, guesses: state.wrong.length };
    if (move.kind === "guess") {
      if (move.hero === hero) return { won: true, questions: state.asked.length, guesses: state.wrong.length + 1 };
      state = wrongGuess(state, move.hero);
      continue;
    }
    const truth = move.trait.yes.includes(hero);
    state = answer(state, move.trait, state.asked.length === opts.lie ? !truth : truth);
  }
  throw new Error("game did not end");
}

describe("Taktikai Előny data", () => {
  it("has every hero of the Szabálytár and only known heroes in the table", () => {
    expect(heroes.length).toBeGreaterThanOrEqual(45);
    for (const t of traits) for (const id of t.yes) expect(ids, `${t.id}: ${id}`).toContain(id);
  });

  it("asks no question that fits a single hero, and no Season questions", () => {
    for (const t of traits) expect(t.yes.length, t.id).toBeGreaterThanOrEqual(2);
    expect(traits.some((t) => /season|évad/i.test(t.id + t.q))).toBe(false);
  });

  it("tells every two heroes apart by at least two questions", () => {
    const vec = (id: string) => traits.map((t: Trait) => t.yes.includes(id));
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = vec(ids[i]);
        const b = vec(ids[j]);
        const diff = a.filter((v, k) => v !== b[k]).length;
        expect(diff, `${ids[i]} vs ${ids[j]}`).toBeGreaterThanOrEqual(2);
      }
  });
});

describe("the Hadvezér's game", () => {
  it("finds every hero with honest answers, within 10 questions and 3 guesses", () => {
    for (const id of ids) {
      const r = play(id);
      expect(r.won, id).toBe(true);
      expect(r.questions).toBeLessThanOrEqual(MAX_QUESTIONS);
      expect(r.guesses).toBeLessThanOrEqual(MAX_GUESSES);
    }
  });

  it("usually still finds the hero when the player gets one answer wrong", () => {
    let games = 0;
    let won = 0;
    for (const id of ids)
      for (let lie = 0; lie < 6; lie++) {
        games++;
        if (play(id, { lie }).won) won++;
      }
    expect(won / games).toBeGreaterThan(0.6);
  });

  it("varies its questions between games", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const first = new Set(Array.from({ length: 10 }, () => (nextMove(newGame(ids), traits, rand) as { trait: Trait }).trait.id));
    expect(first.size).toBeGreaterThan(1);
  });

  it("gives up after three wrong guesses", () => {
    let s = newGame(["a", "b", "c", "d"]);
    s = { ...s, asked: Array.from({ length: MAX_QUESTIONS }, () => ({ trait: "x", yes: true })) };
    for (const h of ["a", "b", "c"]) s = wrongGuess(s, h);
    expect(nextMove(s, []).kind).toBe("give-up");
  });
});

describe("game length", () => {
  it("needs few questions on average", () => {
    const qs = ids.map((id) => play(id).questions);
    const avg = qs.reduce((a, b) => a + b, 0) / qs.length;
    console.log(`average questions: ${avg.toFixed(1)}, max: ${Math.max(...qs)}`);
    expect(avg).toBeLessThan(9);
  });
});

describe("Nem tudom", () => {
  it("tells him nothing, isn't asked again and doesn't use up a question", () => {
    const start = newGame(ids);
    const move = nextMove(start, traits, () => 0);
    if (move.kind !== "ask") throw new Error("expected a question");
    const s = answer(start, move.trait, null);
    expect(s.weights).toEqual(start.weights);
    expect(answered(s)).toBe(0);
    const next = nextMove(s, traits, () => 0);
    expect(next.kind === "ask" && next.trait.id).not.toBe(move.trait.id);
  });

  it("still finds the hero when the player doesn't know two answers", () => {
    for (const id of ids) {
      let state: GameState = newGame(ids);
      let unknown = 0;
      let won = false;
      for (let step = 0; step < 60 && !won; step++) {
        const move = nextMove(state, traits, () => 0);
        if (move.kind === "give-up") break;
        if (move.kind === "guess") {
          if (move.hero === id) won = true;
          else state = wrongGuess(state, move.hero);
          continue;
        }
        state = answer(state, move.trait, unknown < 2 ? (unknown++, null) : move.trait.yes.includes(id));
      }
      expect(won, id).toBe(true);
    }
  });
});
