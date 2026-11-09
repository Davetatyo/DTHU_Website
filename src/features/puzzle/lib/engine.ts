// The Taktikai feladvány rules engine. A puzzle starts at the end of the attacker's Offensive
// Roll Phase with fixed dice: the player plays cards from the hand, then picks one ability.
// The engine works out, over every possible outcome of the rolls that follow (Blind check,
// ability rolls, the defensive roll, Evasive), how likely the attack is to win the game.
// Pure and browser-safe.
//
// Season 1 rules used (owner to confirm, see the README):
// - Stun inflicted before the damage stops the defender's defensive roll and Evasive.
// - Ultimates can't be defended or evaded.
// - Undefendable damage skips the defensive roll, but Evasive still works.
// - The defender spends Evasive tokens only when the damage would be lethal.
// - Only this attack counts (no extra Offensive Roll Phase from Stun).
// - A win needs the defender at 0 HP and the attacker above 0; both at 0 is a tie.

import { allRolls, type HeroId } from "./dice";
import { card, unplayableReason } from "./cards";
import { HEROES, STATUS, heroKit, type Ability, type Defence, type StatusId } from "./heroes";

export type Side = "attacker" | "defender";

export type Fighter = {
  hero: HeroId;
  hp: number;
  cp: number;
  statuses: Partial<Record<StatusId, number>>;
  /** Upgrade cards in play (slugs). */
  upgrades: string[];
};

export type PuzzleState = {
  attacker: Fighter;
  defender: Fighter;
  /** The attacker's dice after the last roll attempt. */
  dice: number[];
  /** Card slugs in the attacker's hand. */
  hand: string[];
};

export type Move =
  | { k: "six"; card: string; die: number }
  | { k: "wild"; card: string; die: number; value: number }
  | { k: "wild2"; card: string; die: number; value: number; die2: number; value2: number }
  | { k: "tip"; card: string; die: number; delta: 1 | -1 }
  | { k: "copy"; card: string; die: number; from: number }
  | { k: "cp"; card: string }
  | { k: "unstatus"; card: string; side: Side; status: StatusId };

const VALUES = [1, 2, 3, 4, 5, 6];

function clone(s: PuzzleState): PuzzleState {
  return {
    attacker: { ...s.attacker, statuses: { ...s.attacker.statuses }, upgrades: [...s.attacker.upgrades] },
    defender: { ...s.defender, statuses: { ...s.defender.statuses }, upgrades: [...s.defender.upgrades] },
    dice: [...s.dice],
    hand: [...s.hand],
  };
}

const okDie = (s: PuzzleState, i: number) => Number.isInteger(i) && i >= 0 && i < s.dice.length;
const okValue = (v: number) => VALUES.includes(v);

/** Plays a card. Returns the new state, or a Hungarian error message. */
export function applyMove(s: PuzzleState, m: Move): PuzzleState | string {
  const at = s.hand.indexOf(m.card);
  if (at < 0) return "Ez a lap nincs a kezedben.";
  const c = card(m.card);
  const why = unplayableReason(c);
  if (why) return why;
  if (c.play!.k !== m.k) return "Ez a lap nem így működik.";
  if (c.cost > s.attacker.cp) return `Nincs elég CP-d (${c.cost} kell).`;

  const n = clone(s);
  n.hand.splice(at, 1);
  n.attacker.cp -= c.cost;
  switch (m.k) {
    case "six":
      if (!okDie(s, m.die)) return "Válassz kockát.";
      n.dice[m.die] = 6;
      break;
    case "wild":
      if (!okDie(s, m.die) || !okValue(m.value)) return "Válassz kockát és értéket.";
      n.dice[m.die] = m.value;
      break;
    case "wild2":
      if (!okDie(s, m.die) || !okDie(s, m.die2) || m.die === m.die2) return "Válassz két különböző kockát.";
      if (!okValue(m.value) || !okValue(m.value2)) return "Válassz értéket.";
      n.dice[m.die] = m.value;
      n.dice[m.die2] = m.value2;
      break;
    case "tip": {
      if (!okDie(s, m.die)) return "Válassz kockát.";
      const v = s.dice[m.die] + m.delta;
      if (!okValue(v)) return m.delta > 0 ? "A 6-os nem növelhető." : "Az 1-es nem csökkenthető.";
      n.dice[m.die] = v;
      break;
    }
    case "copy":
      if (!okDie(s, m.die) || !okDie(s, m.from) || m.die === m.from) return "Válassz két különböző kockát.";
      n.dice[m.die] = s.dice[m.from];
      break;
    case "cp":
      n.attacker.cp += (c.play as { n: number }).n;
      break;
    case "unstatus": {
      const f = n[m.side];
      if (!f.statuses[m.status]) return "Ezen a játékoson nincs ilyen állapotjelző.";
      f.statuses[m.status]! -= 1;
      if (!f.statuses[m.status]) delete f.statuses[m.status];
      break;
    }
  }
  return n;
}

/** Every card play possible from this state (for the solver). */
export function legalMoves(s: PuzzleState): Move[] {
  const moves: Move[] = [];
  const dice = s.dice.map((_, i) => i);
  for (const slug of new Set(s.hand)) {
    const c = card(slug);
    if (unplayableReason(c) || c.cost > s.attacker.cp) continue;
    switch (c.play!.k) {
      case "six":
        for (const i of dice) if (s.dice[i] !== 6) moves.push({ k: "six", card: slug, die: i });
        break;
      case "wild":
        for (const i of dice) for (const v of VALUES) if (v !== s.dice[i]) moves.push({ k: "wild", card: slug, die: i, value: v });
        break;
      case "wild2":
        for (const i of dice)
          for (const j of dice)
            if (i < j)
              for (const v of VALUES)
                for (const w of VALUES)
                  if (v !== s.dice[i] || w !== s.dice[j]) moves.push({ k: "wild2", card: slug, die: i, value: v, die2: j, value2: w });
        break;
      case "tip":
        for (const i of dice) {
          if (s.dice[i] < 6) moves.push({ k: "tip", card: slug, die: i, delta: 1 });
          if (s.dice[i] > 1) moves.push({ k: "tip", card: slug, die: i, delta: -1 });
        }
        break;
      case "copy":
        for (const i of dice) for (const j of dice) if (i !== j && s.dice[i] !== s.dice[j]) moves.push({ k: "copy", card: slug, die: i, from: j });
        break;
      case "cp":
        moves.push({ k: "cp", card: slug });
        break;
      case "unstatus":
        for (const side of ["attacker", "defender"] as Side[])
          for (const status of Object.keys(s[side].statuses) as StatusId[])
            if (s[side].statuses[status]) moves.push({ k: "unstatus", card: slug, side, status });
        break;
    }
  }
  return moves;
}

/** The abilities the attacker's dice qualify for right now. */
export function availableAbilities(s: PuzzleState): Ability[] {
  return heroKit(s.attacker.hero, s.attacker.upgrades).abilities.filter((a) => a.resolve(s.dice) !== null);
}

// ─── Resolving an attack ────────────────────────────────────────────────────

export type AttackResult = {
  ability: string | null;
  /** Chance the defender drops to 0 while the attacker stays alive. */
  win: number;
  /** Chance both drop to 0. */
  tie: number;
  /** Chance the attacker dies and the defender doesn't. */
  lose: number;
  /** Damage before defence (lowest and highest). */
  damage: { min: number; max: number };
  /** Why the numbers are what they are, in Hungarian. */
  notes: string[];
};

type Weighted<T> = { p: number; v: T };

const defenceCache = new Map<string, Weighted<{ prevent: number; counter: number; heal: number }>[]>();

/** Every defensive roll outcome against `incoming` damage, grouped. */
function defenceOutcomes(d: Defence, incoming: number) {
  const key = `${d.id}:${d.card ?? ""}:${incoming}`;
  const hit = defenceCache.get(key);
  if (hit) return hit;
  const groups = new Map<string, Weighted<{ prevent: number; counter: number; heal: number }>>();
  const rolls = allRolls(d.dice);
  for (const r of rolls) {
    const o = d.outcome(r, incoming);
    const k = `${o.prevent}|${o.counter}|${o.heal}`;
    const g = groups.get(k);
    if (g) g.p += 1 / rolls.length;
    else groups.set(k, { p: 1 / rolls.length, v: o });
  }
  const out = [...groups.values()];
  defenceCache.set(key, out);
  return out;
}

const pct = (p: number) => `${(Math.round(p * 1000) / 10).toString().replace(".", ",")}%`;

/** How likely `abilityId` (or no ability: null) is to win the game from this state. */
export function resolveAttack(s: PuzzleState, abilityId: string | null): AttackResult {
  const A = s.attacker;
  const D = s.defender;
  const dName = `a ${HEROES[D.hero].name}`;
  const DName = `A ${HEROES[D.hero].name}`;
  const none: AttackResult = { ability: abilityId, win: 0, tie: 0, lose: 0, damage: { min: 0, max: 0 }, notes: [] };
  if (!abilityId) return { ...none, notes: ["Nem aktiválsz képességet, így nincs sebzés."] };

  const ability = heroKit(A.hero, A.upgrades).abilities.find((a) => a.id === abilityId);
  const effects = ability?.resolve(s.dice);
  if (!ability || !effects) return { ...none, notes: ["A kockáid nem adják ki ezt a képességet."] };

  const notes: string[] = [];
  const blindFail = A.statuses.blind ? 2 / 6 : 0;
  if (blindFail) notes.push(`Vak vagy: a támadás végén dobsz, 1–2 esetén (${pct(blindFail)}) a támadásod hatástalan.`);

  let stunned = !!D.statuses.stun;
  let targeted = !!D.statuses.targeted;
  let undefendable = false;
  let fixed = 0;
  let roll: Extract<(typeof effects)[number], { t: "rollDamage" }> | null = null;
  let heal = 0;
  let recoil = 0;
  let hasDamage = false;
  for (const e of effects) {
    if (e.t === "inflict" && e.status === "stun" && !stunned) {
      stunned = true;
      if (!ability.ultimate)
        notes.push(`A Kábítás a sebzés előtt jön: ${dName} nem védekezhet, és Elkerülést sem használhat.`);
    }
    if (e.t === "inflict" && e.status === "targeted") targeted = true;
    if (e.t === "damage") {
      fixed += e.amount;
      hasDamage = true;
      if (e.undefendable) undefendable = true;
    }
    if (e.t === "rollDamage") {
      roll = e;
      hasDamage = true;
    }
    if (e.t === "heal") heal += e.amount;
    if (e.t === "recoil") recoil += e.amount;
  }
  if (!hasDamage) return { ...none, notes: [...notes, "Ez a képesség nem sebez."] };

  const bonus = targeted ? 2 : 0;
  if (bonus) notes.push(`${DName} Célzott: +2 sebzés.`);
  // Damage before defence, as a distribution (a roll inside the ability makes it vary).
  const dmgDist = new Map<number, number>();
  if (roll) {
    const rolls = allRolls(roll.dice);
    for (const r of rolls) {
      const v = fixed + roll.amount(r) + bonus;
      dmgDist.set(v, (dmgDist.get(v) ?? 0) + 1 / rolls.length);
    }
    notes.push(`A sebzés dobástól függ (${roll.dice} kocka: ${roll.text}).`);
  } else dmgDist.set(fixed + bonus, 1);
  const amounts = [...dmgDist.keys()];
  const damage = { min: Math.min(...amounts), max: Math.max(...amounts) };

  const ultimate = !!ability.ultimate;
  const evasive = D.statuses.evasive ?? 0;
  const canDefend = !ultimate && !stunned && !undefendable;
  const canEvade = !ultimate && !stunned && evasive > 0;
  const dKit = heroKit(D.hero, D.upgrades);
  if (ultimate) notes.push("Végső képesség (Ultimate): nem lehet ellene védekezni, sem kitérni.");
  else if (undefendable && !stunned) notes.push("Védhetetlen: nincs védődobás.");
  if (canDefend) notes.push(`${DName} védekezik (${dKit.defence.name}: ${dKit.defence.does}).`);
  if (canEvade)
    notes.push(
      `${DName} ${evasive} Elkerülés jelzőt tart: ha a sebzés halálos, elkölti őket, mindegyik 1/3 eséllyel hárítja az egészet.`,
    );

  let win = 0;
  let tie = 0;
  let lose = 0;
  const hit = 1 - blindFail;
  for (const [amount, p1] of dmgDist) {
    const defs = canDefend ? defenceOutcomes(dKit.defence, amount) : [{ p: 1, v: { prevent: 0, counter: 0, heal: 0 } }];
    for (const { p: p2, v: o } of defs) {
      const taken = Math.max(0, amount - o.prevent);
      const lethal = D.hp + o.heal - taken <= 0;
      const evadeP = canEvade && taken > 0 && lethal ? 1 - (2 / 3) ** evasive : 0;
      for (const [dealt, p3] of [
        [taken, 1 - evadeP],
        [0, evadeP],
      ] as const) {
        if (p3 === 0) continue;
        const p = hit * p1 * p2 * p3;
        const defHp = D.hp + o.heal - dealt;
        const atkHp = A.hp + heal - o.counter - (dealt >= 1 ? recoil : 0);
        if (defHp <= 0 && atkHp > 0) win += p;
        else if (defHp <= 0) tie += p;
        else if (atkHp <= 0) lose += p;
      }
    }
  }
  if (recoil) notes.push(`Ha bemegy legalább 1 sebzés, ${recoil} sebzést kapsz vissza.`);
  return { ability: abilityId, win, tie, lose, damage, notes };
}

// ─── Statuses shown in the UI ───────────────────────────────────────────────

export function statusList(f: Fighter): { id: StatusId; n: number; name: string; text: string }[] {
  return (Object.keys(f.statuses) as StatusId[])
    .filter((id) => f.statuses[id])
    .map((id) => ({ id, n: f.statuses[id]!, name: STATUS[id].name, text: STATUS[id].text }));
}
