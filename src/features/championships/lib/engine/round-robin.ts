import type { Pairing, Participant } from "./types";
import { createRng, shuffle } from "./seed";

/**
 * Circle method: fix one player, rotate the rest each round.
 * Odd count → dummy player; whoever meets the dummy has the bye.
 */
export function generateRoundRobin(
  players: Participant[],
  opts: { double?: boolean; seed: string },
): Pairing[][] {
  const active = players.filter((p) => !p.dropped);
  if (active.length < 2) return [];

  const sorted = active
    .slice()
    .sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity));
  const list = shuffle(sorted, createRng(opts.seed));

  const hasOdd = list.length % 2 !== 0;
  const DUMMY = "__BYE__";
  const circle: string[] = hasOdd ? [...list.map((p) => p.id), DUMMY] : list.map((p) => p.id);
  const n = circle.length;
  const totalRounds = n - 1;

  const rounds: Pairing[][] = [];

  for (let r = 0; r < totalRounds; r++) {
    const pairs: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i];
      const b = circle[n - 1 - i];
      if (a === DUMMY) {
        pairs.push({ p1: b, p2: null });
      } else if (b === DUMMY) {
        pairs.push({ p1: a, p2: null });
      } else {
        pairs.push({ p1: a, p2: b });
      }
    }
    rounds.push(pairs);
    rotate(circle);
  }

  if (opts.double) {
    for (let r = 0; r < totalRounds; r++) {
      const pairs: Pairing[] = [];
      for (let i = 0; i < n / 2; i++) {
        const a = circle[i];
        const b = circle[n - 1 - i];
        if (a === DUMMY) {
          pairs.push({ p1: b, p2: null });
        } else if (b === DUMMY) {
          pairs.push({ p1: a, p2: null });
        } else {
          pairs.push({ p1: b, p2: a });
        }
      }
      rounds.push(pairs);
      rotate(circle);
    }
  }

  return rounds;
}

/** Rotate all elements except the first one position clockwise. */
function rotate(arr: string[]): void {
  if (arr.length < 3) return;
  const last = arr.pop()!;
  arr.splice(1, 0, last);
}

