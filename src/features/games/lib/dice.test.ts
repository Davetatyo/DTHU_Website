import { describe, expect, it } from "vitest";
import { bonus, chooseBox, chooseHolds, DISTRACTED, highlight, openBoxes, rollDie, score, total, VARIANTS, type Card, type Category, type Variant } from "./dice";

describe("scoring", () => {
  it("scores every box", () => {
    expect(score("threes", [3, 3, 1, 3, 6])).toBe(9);
    expect(score("three-kind", [4, 4, 4, 1, 2])).toBe(15);
    expect(score("three-kind", [4, 4, 1, 1, 2])).toBe(0);
    expect(score("four-kind", [6, 6, 6, 6, 2])).toBe(26);
    expect(score("full", [2, 2, 5, 5, 5])).toBe(25);
    expect(score("full", [5, 5, 5, 5, 5])).toBe(0);
    expect(score("small", [1, 2, 3, 4, 6])).toBe(30);
    expect(score("small", [3, 4, 5, 6, 6])).toBe(30);
    expect(score("small", [1, 2, 3, 5, 6])).toBe(0);
    expect(score("large", [2, 3, 4, 5, 6])).toBe(40);
    expect(score("large", [1, 2, 3, 4, 6])).toBe(0);
    expect(score("ultimate", [4, 4, 4, 4, 4])).toBe(50);
    expect(score("chance", [1, 2, 3, 4, 6])).toBe(16);
  });

  it("gives the +35 bonus at 63 in the upper section, only in the full game", () => {
    const card: Card = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
    expect(bonus(card, "full")).toBe(35);
    expect(total(card, "full")).toBe(63 + 35);
    expect(bonus({ ...card, sixes: 12 }, "full")).toBe(0);
    expect(bonus(card, "short")).toBe(0);
  });

  it("has 7 boxes in the short game and 13 in the full one", () => {
    expect(VARIANTS.short.categories).toHaveLength(7);
    expect(VARIANTS.full.categories).toHaveLength(13);
    expect(openBoxes({ chance: 20 }, "short")).not.toContain("chance");
  });

  it("names the best combination", () => {
    expect(highlight([6, 6, 6, 6, 6])).toBe("ultimate");
    expect(highlight([1, 2, 3, 4, 5])).toBe("large");
    expect(highlight([1, 1, 2, 2, 4])).toBe(null);
  });
});

/** A seeded random generator, so the Barbarian's games repeat in tests. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe("the Barbarian's play", () => {
  it("keeps four of a kind when chasing points", () => {
    const holds = chooseHolds([5, 5, 5, 5, 2], ["ultimate", "four-kind", "fives"], 2, seeded(7));
    expect(holds).toEqual([true, true, true, true, false]);
  });

  it("writes a large straight in Nagy sor", () => {
    expect(chooseBox([2, 3, 4, 5, 6], ["large", "chance", "sixes"])).toBe("large");
  });

  it("scores like a decent amateur over whole games", () => {
    for (const variant of ["short", "full"] as Variant[]) {
      const rand = seeded(variant === "full" ? 42 : 4242);
      let sumTotal = 0;
      const games = 30;
      for (let g = 0; g < games; g++) {
        const card: Card = {};
        for (let round = 0; round < VARIANTS[variant].categories.length; round++) {
          const open = openBoxes(card, variant);
          let dice = Array.from({ length: 5 }, () => rollDie(rand));
          for (let rollsLeft = 2; rollsLeft > 0; rollsLeft--) {
            const keep = chooseHolds(dice, open, rollsLeft, rand, 20, DISTRACTED);
            dice = dice.map((v, i) => (keep[i] ? v : rollDie(rand)));
          }
          const box: Category = chooseBox(dice, open);
          card[box] = score(box, dice);
        }
        sumTotal += total(card, variant);
      }
      const avg = sumTotal / games;
      console.log(`${variant}: average ${avg.toFixed(0)}`);
      // Random play scores ~45 (short) / ~70 (full); a careful player ~130 / ~220. Distracted
      // by cheering for you, he should land in between: beatable, but not a pushover.
      expect(avg).toBeGreaterThan(variant === "short" ? 90 : 160);
      expect(avg).toBeLessThan(variant === "short" ? 125 : 215);
    }
  });
});
