// The Season 1 heroes' abilities as the puzzle engine uses them, read off the original Season 1
// hero boards and upgrade cards (Dice_Throne_Card_Scanner/sources/S1). Pure and browser-safe.
//
// Only what decides damage and health is modelled. Statuses that matter for a lethal check are
// handled by the engine (Stun, Targeted, Evasive, Blind); the others are only shown.

import { countSym, hasStraight, maxOfAKind, type HeroId } from "./dice";

export type StatusId = "stun" | "concussion" | "blind" | "entangle" | "targeted" | "evasive";

/** Names as the site's Szabálytár uses them. */
export const STATUS: Record<StatusId, { name: string; nameEn: string; positive?: boolean; text: string }> = {
  stun: {
    name: "Kábítás",
    nameEn: "Stun",
    text: "Semmilyen akciót nem tehet: nem védekezhet, lapot és állapotjelzőt sem használhat.",
  },
  concussion: { name: "Agyrázkódás", nameEn: "Concussion", text: "Kihagyja a következő bevételi fázisát." },
  blind: {
    name: "Vak",
    nameEn: "Blind",
    text: "A támadási fázisa végén dob 1 kockával: 1–2 esetén a támadási fázis hatástalan.",
  },
  entangle: { name: "Gubanc", nameEn: "Entangle", text: "A következő támadási fázisában 1-gyel kevesebbet dobhat." },
  targeted: { name: "Célzott", nameEn: "Targeted", text: "Minden őt ért támadás +2 sebzést okoz. Tartós." },
  evasive: {
    name: "Elkerülés",
    nameEn: "Evasive",
    positive: true,
    text: "Sebzéskor elkölthető: 1 kockadobás, 1–2 esetén nem kap sebzést. Több is elkölthető ugyanarra.",
  },
};

export type Effect =
  | { t: "inflict"; status: StatusId }
  | { t: "gain"; status: StatusId; n?: number }
  | { t: "damage"; amount: number; undefendable?: boolean }
  /** Roll dice during the attack; the roll decides the damage (Overpower, Exploding Arrow). */
  | { t: "rollDamage"; dice: number; amount: (roll: number[]) => number; text: string }
  | { t: "heal"; amount: number }
  /** The attacker takes this undefendable damage if at least 1 damage was dealt (Reckless). */
  | { t: "recoil"; amount: number };

export type Ability = {
  id: string;
  name: string;
  nameEn: string;
  /** What the dice must show, in Hungarian. */
  needs: string;
  /** What it does, in Hungarian. */
  does: string;
  ultimate?: boolean;
  /** The upgrade card it comes from (slug), if any. */
  card?: string;
  /** The effects for these dice, or null when the dice don't qualify. */
  resolve: (dice: readonly number[]) => Effect[] | null;
};

export type DefenceResult = { prevent: number; counter: number; heal: number };

export type Defence = {
  id: string;
  name: string;
  nameEn: string;
  dice: number;
  does: string;
  card?: string;
  outcome: (roll: readonly number[], incoming: number) => DefenceResult;
};

type Upgrade = { replaces: string[]; abilities?: Ability[]; defence?: Defence };

export type HeroDef = {
  id: HeroId;
  name: string;
  nameEn: string;
  portrait: string;
  board: string;
  maxHp: number;
  abilities: Ability[];
  defence: Defence;
  /** Upgrade card slug → what it changes. */
  upgrades: Record<string, Upgrade>;
};

const dmg = (amount: number, undefendable = false): Effect => ({ t: "damage", amount, undefendable });
const inflict = (...ss: StatusId[]): Effect[] => ss.map((status) => ({ t: "inflict", status }));

/** "3/4/5 of a symbol" abilities: the best tier the dice reach. */
function tiers(have: number, values: number[]): number | null {
  if (have >= 5) return values[2];
  if (have >= 4) return values[1];
  if (have >= 3) return values[0];
  return null;
}

// ─── Barbarian ──────────────────────────────────────────────────────────────

const B: HeroId = "barbarian";
const sw = (d: readonly number[]) => countSym(B, d, "sword");
const hearts = (d: readonly number[]) => countSym(B, d, "heart");
const pows = (d: readonly number[]) => countSym(B, d, "pow");

function smack(values: number[], card?: string): Ability {
  return {
    id: "smack",
    name: "Pofon",
    nameEn: "Smack",
    needs: "3 / 4 / 5 kard",
    does: `${values.join(" / ")} sebzés${card ? ", 4 egyforma számnál védhetetlen" : ""}`,
    card,
    resolve: (d) => {
      const amount = tiers(sw(d), values);
      return amount === null ? null : [dmg(amount, !!card && maxOfAKind(d) >= 4)];
    },
  };
}

function sturdyBlow(amount: number, card?: string): Ability {
  return {
    id: "sturdy-blow",
    name: "Masszív csapás",
    nameEn: "Sturdy Blow",
    needs: "2 kard + 2 pow",
    does: `${amount} védhetetlen sebzés`,
    card,
    resolve: (d) => (sw(d) >= 2 && pows(d) >= 2 ? [dmg(amount, true)] : null),
  };
}

function mightyBlow(amount: number, undefendable: boolean, card?: string): Ability {
  return {
    id: "mighty-blow",
    name: "Csodás csapás",
    nameEn: "Mighty Blow",
    needs: "kis sor",
    does: `${amount}${undefendable ? " védhetetlen" : ""} sebzés`,
    card,
    resolve: (d) => (hasStraight(d, 4) ? [dmg(amount, undefendable)] : null),
  };
}

function critBash(amount: number, card?: string): Ability {
  return {
    id: "crit-bash",
    name: "Kritikus ütés",
    nameEn: "Crit Bash",
    needs: "4 pow",
    does: `Kábítás, utána ${amount} védhetetlen sebzés`,
    card,
    resolve: (d) => (pows(d) >= 4 ? [...inflict("stun"), dmg(amount, true)] : null),
  };
}

function fortitude(values: number[], card?: string): Ability {
  return {
    id: "fortitude",
    name: "Erősítés",
    nameEn: "Fortitude",
    needs: "3 / 4 / 5 szív",
    does: `${values.join(" / ")} gyógyulás`,
    card,
    resolve: (d) => {
      const amount = tiers(hearts(d), values);
      return amount === null ? null : [{ t: "heal", amount }];
    },
  };
}

function overpower(concussionAt: number, card?: string): Ability {
  return {
    id: "overpower",
    name: "Túlerő",
    nameEn: "Overpower",
    needs: "3 kard + 2 pow",
    does: `dobj 3 kockával, a dobás összege a sebzés (${concussionAt}+ esetén Agyrázkódás)`,
    card,
    resolve: (d) =>
      sw(d) >= 3 && pows(d) >= 2
        ? [{ t: "rollDamage", dice: 3, amount: (r) => r.reduce((a, b) => a + b, 0), text: "a 3 kocka összege" }]
        : null,
  };
}

function reckless(amount: number, recoil: number, card?: string): Ability {
  return {
    id: "reckless",
    name: "Őrület",
    nameEn: "Reckless",
    needs: "nagy sor",
    does: `${amount} sebzés, ${recoil} sebzést kapsz vissza (ha legalább 1 bement)`,
    card,
    resolve: (d) => (hasStraight(d, 5) ? [dmg(amount), { t: "recoil", amount: recoil }] : null),
  };
}

function thickSkin(dice: number, card?: string): Defence {
  return {
    id: "thick-skin",
    name: "Vastag bőr",
    nameEn: "Thick Skin",
    dice,
    does: `${dice} kocka: 2 gyógyulás szívenként`,
    card,
    outcome: (r) => ({ prevent: 0, counter: 0, heal: 2 * hearts(r) }),
  };
}

const BARBARIAN: HeroDef = {
  id: B,
  name: "Barbár",
  nameEn: "Barbarian",
  portrait: "/szabalytar/img/heroes/barbarian.webp",
  board: "/jatekok/feladvany/boards/barbarian.webp",
  maxHp: 50,
  abilities: [
    smack([4, 6, 8]),
    sturdyBlow(4),
    mightyBlow(9, false),
    critBash(5),
    fortitude([4, 5, 6]),
    overpower(14),
    reckless(15, 4),
    {
      id: "rage",
      name: "Düh!",
      nameEn: "Rage!",
      needs: "5 pow",
      does: "Kábítás, 15 sebzés",
      ultimate: true,
      resolve: (d) => (pows(d) >= 5 ? [...inflict("stun"), dmg(15)] : null),
    },
  ],
  defence: thickSkin(3),
  upgrades: {
    "smack-ii": { replaces: ["smack"], abilities: [smack([5, 7, 9], "smack-ii")] },
    "smack-iii": { replaces: ["smack"], abilities: [smack([6, 8, 10], "smack-iii")] },
    "sturdy-blow-ii": { replaces: ["sturdy-blow"], abilities: [sturdyBlow(5, "sturdy-blow-ii")] },
    "sturdy-blow-iii": { replaces: ["sturdy-blow"], abilities: [sturdyBlow(6, "sturdy-blow-iii")] },
    "mighty-blow-ii": { replaces: ["mighty-blow"], abilities: [mightyBlow(8, true, "mighty-blow-ii")] },
    "reckless-ii": { replaces: ["reckless"], abilities: [reckless(20, 5, "reckless-ii")] },
    "fortitude-ii": { replaces: ["fortitude"], abilities: [fortitude([5, 6, 7], "fortitude-ii")] },
    "overpower-ii": {
      replaces: ["overpower"],
      abilities: [
        overpower(10, "overpower-ii"),
        {
          id: "war-cry",
          name: "Csatakiáltás",
          nameEn: "War Cry",
          needs: "2 kard + 2 szív",
          does: "2 gyógyulás, 2 védhetetlen sebzés",
          card: "overpower-ii",
          resolve: (d) => (sw(d) >= 2 && hearts(d) >= 2 ? [{ t: "heal", amount: 2 }, dmg(2, true)] : null),
        },
      ],
    },
    "crit-bash-ii": {
      replaces: ["crit-bash"],
      abilities: [
        critBash(7, "crit-bash-ii"),
        {
          id: "crit-smash",
          name: "Kritikus verés",
          nameEn: "Crit Smash",
          needs: "3 pow",
          does: "Agyrázkódás, utána 2 védhetetlen sebzés",
          card: "crit-bash-ii",
          resolve: (d) => (pows(d) >= 3 ? [...inflict("concussion"), dmg(2, true)] : null),
        },
      ],
    },
    "thick-skin-ii": { replaces: [], defence: thickSkin(4, "thick-skin-ii") },
  },
};

// ─── Moon Elf ───────────────────────────────────────────────────────────────

const M: HeroId = "moon-elf";
const arrows = (d: readonly number[]) => countSym(M, d, "arrow");
const feet = (d: readonly number[]) => countSym(M, d, "foot");
const moons = (d: readonly number[]) => countSym(M, d, "moon");

function longbow(values: number[], entangleAt: number | null, card?: string): Ability {
  return {
    id: "longbow",
    name: "Longbow",
    nameEn: "Longbow",
    needs: "3 / 4 / 5 nyíl",
    does: `${values.join(" / ")} sebzés${entangleAt ? `, ${entangleAt} egyforma számnál Gubanc` : ""}`,
    card,
    resolve: (d) => {
      const amount = tiers(arrows(d), values);
      if (amount === null) return null;
      return [...(entangleAt && maxOfAKind(d) >= entangleAt ? inflict("entangle") : []), dmg(amount)];
    },
  };
}

function demisingShot(amount: number, card?: string): Ability {
  return {
    id: "demising-shot",
    name: "Demising Shot",
    nameEn: "Demising Shot",
    needs: "3 nyíl + 2 hold",
    does: `Célzott, utána ${amount} sebzés`,
    card,
    resolve: (d) => (arrows(d) >= 3 && moons(d) >= 2 ? [...inflict("targeted"), dmg(amount)] : null),
  };
}

function coveredShot(amount: number, card?: string): Ability {
  return {
    id: "covered-shot",
    name: "Covered Shot",
    nameEn: "Covered Shot",
    needs: "2 nyíl + 3 láb",
    does: `Elkerülés, ${amount} sebzés`,
    card,
    resolve: (d) => (arrows(d) >= 2 && feet(d) >= 3 ? [{ t: "gain", status: "evasive" }, dmg(amount)] : null),
  };
}

function explodingArrow(perFoot: number, entangle: boolean, card?: string): Ability {
  return {
    id: "exploding-arrow",
    name: "Exploding Arrow",
    nameEn: "Exploding Arrow",
    needs: "1 nyíl + 3 hold",
    does: `dobj 5 kockával: 3 + nyilanként 1 + lábanként ${perFoot} sebzés, Vak${entangle ? ", Gubanc" : ""}`,
    card,
    resolve: (d) =>
      arrows(d) >= 1 && moons(d) >= 3
        ? [
            {
              t: "rollDamage",
              dice: 5,
              amount: (r) => 3 + arrows(r) + perFoot * feet(r),
              text: `3 + nyilanként 1 + lábanként ${perFoot}`,
            },
            ...inflict("blind", ...(entangle ? (["entangle"] as StatusId[]) : [])),
          ]
        : null,
  };
}

function entanglingShot(amount: number, card?: string): Ability {
  return {
    id: "entangling-shot",
    name: "Entangling Shot",
    nameEn: "Entangling Shot",
    needs: "kis sor",
    does: `Gubanc, ${amount} sebzés`,
    card,
    resolve: (d) => (hasStraight(d, 4) ? [...inflict("entangle"), dmg(amount)] : null),
  };
}

function blindingShot(amount: number, card?: string): Ability {
  return {
    id: "blinding-shot",
    name: "Blinding Shot",
    nameEn: "Blinding Shot",
    needs: "nagy sor",
    does: `Vak, Elkerülés, ${amount} sebzés`,
    card,
    resolve: (d) =>
      hasStraight(d, 5) ? [...inflict("blind"), { t: "gain", status: "evasive" }, dmg(amount)] : null,
  };
}

function eclipse(amount: number, card?: string): Ability {
  return {
    id: "eclipse",
    name: "Eclipse",
    nameEn: "Eclipse",
    needs: "4 hold",
    does: `Vak, Gubanc, Célzott, utána ${amount} sebzés`,
    card,
    resolve: (d) => (moons(d) >= 4 ? [...inflict("blind", "entangle", "targeted"), dmg(amount)] : null),
  };
}

function missedMe(counterPerArrow: boolean, card?: string): Defence {
  return {
    id: "missed-me",
    name: "Missed Me",
    nameEn: "Missed Me",
    dice: 5,
    does: counterPerArrow
      ? "5 kocka: 2 lábnál a sebzés felét (felfelé kerekítve) kivédi; nyilanként 1 sebzés"
      : "5 kocka: 2 lábnál a sebzés felét (felfelé kerekítve) kivédi; minden 2 nyílért 1 sebzés",
    card,
    outcome: (r, incoming) => ({
      prevent: feet(r) >= 2 ? Math.ceil(incoming / 2) : 0,
      counter: counterPerArrow ? arrows(r) : Math.floor(arrows(r) / 2),
      heal: 0,
    }),
  };
}

const MOON_ELF: HeroDef = {
  id: M,
  name: "Holdtündé",
  nameEn: "Moon Elf",
  portrait: "/szabalytar/img/heroes/moon-elf.webp",
  board: "/jatekok/feladvany/boards/moon-elf.webp",
  maxHp: 50,
  abilities: [
    longbow([3, 5, 7], null),
    demisingShot(4),
    coveredShot(7),
    explodingArrow(1, false),
    entanglingShot(7),
    blindingShot(8),
    eclipse(7),
    {
      id: "lunar-eclipse",
      name: "Lunar Eclipse!",
      nameEn: "Lunar Eclipse!",
      needs: "5 hold",
      does: "Elkerülés, Vak, Gubanc, Célzott, utána 12 sebzés",
      ultimate: true,
      resolve: (d) =>
        moons(d) >= 5
          ? [{ t: "gain", status: "evasive" }, ...inflict("blind", "entangle", "targeted"), dmg(12)]
          : null,
    },
  ],
  defence: missedMe(false),
  upgrades: {
    "longbow-ii": { replaces: ["longbow"], abilities: [longbow([4, 6, 8], 4, "longbow-ii")] },
    "longbow-iii": { replaces: ["longbow"], abilities: [longbow([5, 7, 9], 3, "longbow-iii")] },
    "demising-shot-ii": {
      replaces: ["demising-shot"],
      abilities: [
        demisingShot(6, "demising-shot-ii"),
        {
          id: "focus",
          name: "Focus",
          nameEn: "Focus",
          needs: "2 nyíl + 1 hold",
          does: "Célzott és Gubanc",
          card: "demising-shot-ii",
          resolve: (d) => (arrows(d) >= 2 && moons(d) >= 1 ? inflict("targeted", "entangle") : null),
        },
      ],
    },
    "covered-shot-ii": {
      replaces: ["covered-shot"],
      abilities: [
        coveredShot(9, "covered-shot-ii"),
        {
          id: "evasive-action",
          name: "Evasive Action",
          nameEn: "Evasive Action",
          needs: "3 láb",
          does: "Elkerülés, 2 védhetetlen sebzés",
          card: "covered-shot-ii",
          resolve: (d) => (feet(d) >= 3 ? [{ t: "gain", status: "evasive" }, dmg(2, true)] : null),
        },
      ],
    },
    "exploding-arrow-ii": { replaces: ["exploding-arrow"], abilities: [explodingArrow(2, false, "exploding-arrow-ii")] },
    "exploding-arrow-iii": { replaces: ["exploding-arrow"], abilities: [explodingArrow(2, true, "exploding-arrow-iii")] },
    "entangling-shot-ii": { replaces: ["entangling-shot"], abilities: [entanglingShot(9, "entangling-shot-ii")] },
    "blinding-shot-ii": {
      replaces: ["blinding-shot"],
      abilities: [
        blindingShot(10, "blinding-shot-ii"),
        {
          id: "lunar-blessing",
          name: "Lunar Blessing",
          nameEn: "Lunar Blessing",
          needs: "1 nyíl + 2 láb + 1 hold",
          does: "3 Elkerülés, Gubanc",
          card: "blinding-shot-ii",
          resolve: (d) =>
            arrows(d) >= 1 && feet(d) >= 2 && moons(d) >= 1
              ? [{ t: "gain", status: "evasive", n: 3 }, ...inflict("entangle")]
              : null,
        },
      ],
    },
    "eclipse-ii": {
      replaces: ["eclipse"],
      abilities: [
        eclipse(9, "eclipse-ii"),
        {
          id: "moon-shadow",
          name: "Moon Shadow",
          nameEn: "Moon Shadow",
          needs: "3 hold",
          does: "Elkerülés, Vak, Gubanc, Célzott",
          card: "eclipse-ii",
          resolve: (d) =>
            moons(d) >= 3 ? [{ t: "gain", status: "evasive" }, ...inflict("blind", "entangle", "targeted")] : null,
        },
      ],
    },
    "missed-me-ii": { replaces: [], defence: missedMe(true, "missed-me-ii") },
  },
};

export const HEROES: Record<HeroId, HeroDef> = { barbarian: BARBARIAN, "moon-elf": MOON_ELF };

/** A hero's abilities and defence with these upgrade cards in play. */
export function heroKit(hero: HeroId, upgrades: readonly string[] = []): { abilities: Ability[]; defence: Defence } {
  const def = HEROES[hero];
  let abilities = [...def.abilities];
  let defence = def.defence;
  for (const slug of upgrades) {
    const up = def.upgrades[slug];
    if (!up) throw new Error(`Unknown upgrade ${slug} for ${hero}`);
    if (up.abilities) {
      const at = abilities.findIndex((a) => up.replaces.includes(a.id));
      abilities = abilities.filter((a) => !up.replaces.includes(a.id));
      abilities.splice(at < 0 ? abilities.length : at, 0, ...up.abilities);
    }
    if (up.defence) defence = up.defence;
  }
  return { abilities, defence };
}

