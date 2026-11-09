// Hungarian text for moves and lines. Card names stay in English, as printed on the card images.
// Pure and browser-safe.

import { card } from "./cards";
import { HEROES, STATUS, heroKit } from "./heroes";
import type { Move, PuzzleState } from "./engine";
import { applyMove } from "./engine";

const SUFFIX = ["", "es", "es", "as", "es", "ös", "os"];
/** A die value with its Hungarian suffix: 3 → "3-as", 5 → "5-ös". */
export function num(v: number): string {
  return `${v}-${SUFFIX[v]}`;
}

/** The Hungarian definite article for a word: "az" before a vowel, else "a". */
export function article(word: string): string {
  return /^[aáeéiíoóöőuúüű]/i.test(word) ? "az" : "a";
}

/** The same with its article: "a 4-es", "az 1-es", "az 5-ös". */
export function theNum(v: number): string {
  return `${v === 1 || v === 5 ? "az" : "a"} ${num(v)}`;
}

/** "Six-It! (1 CP): a 4-es kockából 6-os lesz." style description, against the state before it. */
export function describeMove(before: PuzzleState, m: Move): string {
  const c = card(m.card);
  const head = `${c.name} (${c.cost} CP)`;
  const d = before.dice;
  switch (m.k) {
    case "six":
      return `${head}: ${theNum(d[m.die])} kockából ${num(6)} lesz.`;
    case "wild":
      return `${head}: ${theNum(d[m.die])} kockából ${num(m.value)} lesz.`;
    case "wild2":
      return `${head}: ${theNum(d[m.die])} kockából ${num(m.value)}, ${theNum(d[m.die2])} kockából ${num(m.value2)} lesz.`;
    case "tip":
      return `${head}: ${theNum(d[m.die])} kockából ${num(d[m.die] + m.delta)} lesz.`;
    case "copy":
      return `${head}: ${theNum(d[m.die])} kockából ${num(d[m.from])} lesz (mint a másik kockád).`;
    case "cp":
      return `${head}: +2 CP.`;
    case "unstatus": {
      const who = m.side === "attacker" ? "rólad" : `a ${HEROES[before.defender.hero].name}ről`;
      const name = STATUS[m.status].name;
      return `${head}: leveszed ${who} ${article(name)} ${name} jelzőt.`;
    }
  }
}

/** Every step of a line, in order, as text. */
export function describeLine(start: PuzzleState, moves: Move[], ability: string | null): string[] {
  const out: string[] = [];
  let s = start;
  for (const m of moves) {
    out.push(describeMove(s, m));
    const n = applyMove(s, m);
    if (typeof n === "string") break;
    s = n;
  }
  if (ability) {
    const a = heroKit(s.attacker.hero, s.attacker.upgrades).abilities.find((x) => x.id === ability);
    if (a) out.push(`Támadás: ${a.name} (${a.nameEn}) – ${a.does}.`);
  } else out.push("Nem aktiválsz képességet.");
  return out;
}

/** 0.6667 → "66,7%". */
export function percent(p: number): string {
  const v = Math.round(p * 1000) / 10;
  return `${v.toString().replace(".", ",")}%`;
}
