import { describe, expect, it } from "vitest";
import { countSym, hasStraight, maxOfAKind } from "./dice";
import { applyMove, availableAbilities, resolveAttack, type PuzzleState } from "./engine";
import { heroKit } from "./heroes";
import { PUZZLES } from "./puzzles";
import { solve } from "./solver";
import { article, describeLine, num, percent } from "./text";

const base = (over: Partial<PuzzleState> = {}): PuzzleState => ({
  attacker: { hero: "barbarian", hp: 20, cp: 0, statuses: {}, upgrades: [] },
  defender: { hero: "moon-elf", hp: 20, cp: 0, statuses: {}, upgrades: [] },
  dice: [1, 1, 1, 1, 1],
  hand: [],
  ...over,
});

describe("dice", () => {
  it("reads symbols and patterns", () => {
    expect(countSym("barbarian", [1, 2, 3, 4, 6], "sword")).toBe(3);
    expect(countSym("moon-elf", [4, 5, 6, 6, 1], "moon")).toBe(2);
    expect(hasStraight([1, 2, 3, 4, 4], 4)).toBe(true);
    expect(hasStraight([1, 2, 3, 5, 6], 4)).toBe(false);
    expect(hasStraight([2, 3, 4, 5, 6], 5)).toBe(true);
    expect(maxOfAKind([3, 3, 3, 3, 1])).toBe(4);
  });
});

describe("abilities", () => {
  it("picks the best Smack tier and upgrades replace base abilities", () => {
    const s = base({ dice: [1, 2, 3, 1, 6] });
    expect(resolveAttack(s, "smack").damage).toEqual({ min: 6, max: 6 });
    const up = base({ dice: [1, 2, 3, 1, 6], attacker: { ...base().attacker, upgrades: ["smack-iii"] } });
    expect(resolveAttack(up, "smack").damage.max).toBe(8);
    expect(heroKit("barbarian", ["crit-bash-ii"]).abilities.map((a) => a.id)).toContain("crit-smash");
  });

  it("lists only the abilities the dice qualify for", () => {
    const ids = availableAbilities(base({ dice: [6, 6, 6, 6, 6] })).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["crit-bash", "rage"]));
    expect(ids).not.toContain("smack");
  });
});

describe("resolving an attack", () => {
  it("Missed Me halves the damage on 2 feet", () => {
    // 9 dmg (Mighty Blow) against 5 HP: lethal unless Missed Me rolls 2+ feet (prevent 5 → 4 dmg).
    const s = base({ dice: [1, 2, 3, 4, 6], defender: { ...base().defender, hp: 5 } });
    const r = resolveAttack(s, "mighty-blow");
    // P(at least 2 feet of 5 dice, foot = 1/3) = 1 − (2/3)^5 − 5·(1/3)(2/3)^4
    const pTwoFeet = 1 - (2 / 3) ** 5 - 5 * (1 / 3) * (2 / 3) ** 4;
    expect(r.win).toBeCloseTo(1 - pTwoFeet, 10);
  });

  it("undefendable damage skips the defence but Evasive still works", () => {
    const s = base({ dice: [1, 1, 6, 6, 4], defender: { ...base().defender, hp: 4, statuses: { evasive: 2 } } });
    const r = resolveAttack(s, "sturdy-blow");
    expect(r.win).toBeCloseTo((2 / 3) ** 2, 10);
  });

  it("Stun before the damage stops Evasive", () => {
    const s = base({ dice: [6, 6, 6, 6, 1], defender: { ...base().defender, hp: 5, statuses: { evasive: 3 } } });
    expect(resolveAttack(s, "crit-bash").win).toBe(1);
  });

  it("an Ultimate can't be defended or evaded", () => {
    const s = base({ dice: [6, 6, 6, 6, 6], defender: { ...base().defender, hp: 15, statuses: { evasive: 3 } } });
    expect(resolveAttack(s, "rage").win).toBe(1);
  });

  it("Blind fails the attack on 1–2", () => {
    const s = base({
      dice: [6, 6, 6, 6, 6],
      attacker: { ...base().attacker, statuses: { blind: 1 } },
      defender: { ...base().defender, hp: 15 },
    });
    expect(resolveAttack(s, "rage").win).toBeCloseTo(2 / 3, 10);
  });

  it("Targeted adds 2 damage", () => {
    const s = base({ dice: [6, 6, 6, 6, 6], defender: { ...base().defender, hp: 17, statuses: { targeted: 1 } } });
    expect(resolveAttack(s, "rage").win).toBe(1);
  });

  it("Reckless recoil can make it a tie", () => {
    const s = base({
      dice: [1, 2, 3, 4, 5],
      attacker: { ...base().attacker, hp: 4 },
      defender: { ...base().defender, hp: 8 },
    });
    const r = resolveAttack(s, "reckless");
    // 15 dmg: halved to 7 on 2 feet (survives), else 15 (dies). Recoil 4 kills the attacker
    // whenever damage lands, and Missed Me's counter can kill him first.
    expect(r.win).toBe(0);
    expect(r.tie).toBeGreaterThan(0);
  });

  it("Overpower's damage comes from its roll", () => {
    const s = base({ dice: [1, 2, 3, 6, 6], defender: { ...base().defender, hp: 18 } });
    const r = resolveAttack(s, "overpower");
    expect(r.damage).toEqual({ min: 3, max: 18 });
    expect(r.win).toBeGreaterThan(0);
    expect(r.win).toBeLessThan(0.01);
  });
});

describe("cards", () => {
  it("spends CP and changes dice", () => {
    const s = base({ attacker: { ...base().attacker, cp: 2 }, hand: ["six-it", "tip-it"] });
    const n = applyMove(s, { k: "six", card: "six-it", die: 0 });
    expect(typeof n).toBe("object");
    const ns = n as PuzzleState;
    expect(ns.dice[0]).toBe(6);
    expect(ns.attacker.cp).toBe(1);
    expect(ns.hand).toEqual(["tip-it"]);
    expect(applyMove(ns, { k: "tip", card: "tip-it", die: 1, delta: -1 })).toBe("Az 1-es nem csökkenthető.");
  });

  it("refuses cards without enough CP or outside their phase", () => {
    const s = base({ hand: ["buh-bye", "concuss"] });
    expect(applyMove(s, { k: "unstatus", card: "buh-bye", side: "attacker", status: "blind" })).toMatch(/CP/);
    expect(typeof applyMove(s, { k: "cp", card: "concuss" })).toBe("string");
  });
});

describe("puzzles", () => {
  for (const p of PUZZLES) {
    it(`puzzle ${p.id} has a 100% solution`, () => {
      const sol = solve(p.state);
      expect(sol.best.result.win).toBe(1);
    });
  }

  it("puzzle 1: Buh-Bye on yourself, then 4 pow for Crit Bash II; Rage only 66.7%", () => {
    const p = PUZZLES.find((x) => x.id === "1")!;
    const sol = solve(p.state);
    expect(sol.best.ability).toBe("crit-bash");
    expect(sol.best.moves.map((m) => m.card).sort()).toEqual(["buh-bye", "six-it"]);
    expect(sol.byAbility.get("rage")!.result.win).toBeCloseTo(2 / 3, 10);
    expect(describeLine(p.state, sol.best.moves, sol.best.ability).at(-1)).toMatch(/Kritikus ütés/);
  });
});

describe("text", () => {
  it("formats numbers and percentages in Hungarian", () => {
    expect([1, 3, 5, 6].map(num)).toEqual(["1-es", "3-as", "5-ös", "6-os"]);
    expect(percent(2 / 3)).toBe("66,7%");
    expect(percent(1)).toBe("100%");
    expect(article("Vak")).toBe("a");
    expect(article("Elkerülés")).toBe("az");
  });
});
