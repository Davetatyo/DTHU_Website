// The cards a puzzle hand can hold: the common deck and the Season 1 Barbarian and Moon Elf
// cards (data/cards.json of the Dice_Throne_Card_Scanner repo, images in
// public/jatekok/feladvany/cards/). Pure and browser-safe.
//
// `play` says what the engine does with a card in the attacker's Offensive Roll Phase. Cards
// without it can be shown in a hand but not played there (main phase cards, upgrades, cards
// with random outcomes the first version doesn't model).

export type Timing = "main" | "roll" | "instant" | "upgrade";

export type CardPlay =
  /** Six-It!: one of your dice becomes a 6. */
  | { k: "six" }
  /** So Wild!: one die to any value. */
  | { k: "wild" }
  /** Twice As Wild!: two dice to any values. */
  | { k: "wild2" }
  /** Tip It!: one die ±1 (1 can't go down, 6 can't go up). */
  | { k: "tip" }
  /** Samesies!: one of your dice becomes the value of another of your dice. */
  | { k: "copy" }
  /** Getting Paid!: +2 CP. */
  | { k: "cp"; n: number }
  /** Buh-Bye!: remove 1 status token from a chosen player. */
  | { k: "unstatus" };

export type CardDef = {
  slug: string;
  name: string;
  nameHu?: string;
  cost: number;
  timing: Timing;
  play?: CardPlay;
};

export const TIMING_HU: Record<Timing, string> = {
  main: "Fő fázis",
  roll: "Dobási fázis",
  instant: "Azonnali",
  upgrade: "Hősfejlesztés",
};

const CARDS: CardDef[] = [
  // Common deck
  { slug: "twice-as-wild", name: "Twice As Wild!", nameHu: "Dupla joker!", cost: 3, timing: "roll", play: { k: "wild2" } },
  { slug: "so-wild", name: "So Wild!", nameHu: "Csak joker!", cost: 2, timing: "roll", play: { k: "wild" } },
  { slug: "tip-it", name: "Tip It!", nameHu: "Pöccint!", cost: 1, timing: "instant", play: { k: "tip" } },
  { slug: "not-this-time", name: "Not This Time!", nameHu: "Na de nem most!", cost: 1, timing: "roll" },
  { slug: "six-it", name: "Six-It!", nameHu: "Hatos!", cost: 1, timing: "roll", play: { k: "six" } },
  { slug: "samesies", name: "Samesies!", nameHu: "Tesók!", cost: 1, timing: "roll", play: { k: "copy" } },
  { slug: "try-try-again", name: "Try, Try Again!", nameHu: "Újra, újra!", cost: 1, timing: "roll" },
  { slug: "helping-hand", name: "Helping Hand!", nameHu: "Segítő kéz!", cost: 1, timing: "roll" },
  { slug: "one-more-time", name: "One More Time!", nameHu: "Na mégegyszer!", cost: 1, timing: "roll" },
  { slug: "better-d", name: "Better D!", nameHu: "Jobb véd!", cost: 0, timing: "roll" },
  { slug: "getting-paid", name: "Getting Paid!", nameHu: "Fizu!", cost: 0, timing: "instant", play: { k: "cp", n: 2 } },
  { slug: "vegas-baby", name: "Vegas Baby!", nameHu: "Vegas baby!", cost: 0, timing: "main" },
  { slug: "double-up", name: "Double Up!", nameHu: "Dupla húzó!", cost: 1, timing: "instant" },
  { slug: "triple-up", name: "Triple Up!", nameHu: "Tripla húzó!", cost: 2, timing: "instant" },
  { slug: "buh-bye", name: "Buh-Bye!", nameHu: "Pá-pá!", cost: 2, timing: "instant", play: { k: "unstatus" } },
  { slug: "get-that-outta-here", name: "Get That Outta Here!", nameHu: "Le vele!", cost: 1, timing: "main" },
  { slug: "what-status-effects", name: "What Status Effects?", nameHu: "Le az összessel!", cost: 2, timing: "main" },
  { slug: "transference", name: "Transference!", nameHu: "Transzferálás!", cost: 2, timing: "main" },
  // Barbarian
  { slug: "smack-ii", name: "Smack II", nameHu: "Pofon II", cost: 2, timing: "upgrade" },
  { slug: "smack-iii", name: "Smack III", nameHu: "Pofon III", cost: 3, timing: "upgrade" },
  { slug: "sturdy-blow-ii", name: "Sturdy Blow II", nameHu: "Masszív csapás II", cost: 1, timing: "upgrade" },
  { slug: "sturdy-blow-iii", name: "Sturdy Blow III", nameHu: "Masszív csapás III", cost: 2, timing: "upgrade" },
  { slug: "mighty-blow-ii", name: "Mighty Blow II", nameHu: "Csodás csapás II", cost: 2, timing: "upgrade" },
  { slug: "reckless-ii", name: "Reckless II", nameHu: "Őrület II", cost: 2, timing: "upgrade" },
  { slug: "overpower-ii", name: "Overpower II / War Cry", nameHu: "Túlerő II / Csatakiáltás", cost: 2, timing: "upgrade" },
  { slug: "fortitude-ii", name: "Fortitude II", nameHu: "Erősítés II", cost: 2, timing: "upgrade" },
  { slug: "crit-bash-ii", name: "Crit Bash II / Crit Smash", nameHu: "Kritikus ütés II / Kritikus verés", cost: 2, timing: "upgrade" },
  { slug: "thick-skin-ii", name: "Thick Skin II", nameHu: "Vastag bőr II", cost: 3, timing: "upgrade" },
  { slug: "feelin-good", name: "Feelin' Good!", nameHu: "Nyam-nyamm!", cost: 0, timing: "instant" },
  { slug: "get-some", name: "Get Some!", nameHu: "Nesze!", cost: 2, timing: "roll" },
  { slug: "head-bash", name: "Head Bash!", nameHu: "Lefejelés!", cost: 0, timing: "roll" },
  { slug: "concuss", name: "Concuss!", nameHu: "Kiütés!", cost: 1, timing: "main" },
  { slug: "adrenaline-surge", name: "Adrenaline Surge!", cost: 0, timing: "main" },
  // Moon Elf
  { slug: "longbow-ii", name: "Longbow II", cost: 2, timing: "upgrade" },
  { slug: "longbow-iii", name: "Longbow III", cost: 3, timing: "upgrade" },
  { slug: "demising-shot-ii", name: "Demising Shot II / Focus", cost: 2, timing: "upgrade" },
  { slug: "covered-shot-ii", name: "Covered Shot II / Evasive Action", cost: 2, timing: "upgrade" },
  { slug: "exploding-arrow-ii", name: "Exploding Arrow II", cost: 2, timing: "upgrade" },
  { slug: "exploding-arrow-iii", name: "Exploding Arrow III", cost: 3, timing: "upgrade" },
  { slug: "entangling-shot-ii", name: "Entangling Shot II", cost: 2, timing: "upgrade" },
  { slug: "blinding-shot-ii", name: "Blinding Shot II / Lunar Blessing", cost: 2, timing: "upgrade" },
  { slug: "eclipse-ii", name: "Eclipse II / Moon Shadow", cost: 2, timing: "upgrade" },
  { slug: "missed-me-ii", name: "Missed Me II", cost: 3, timing: "upgrade" },
  { slug: "moon-magic", name: "Moon Magic!", cost: 4, timing: "main" },
  { slug: "take-that", name: "Take That!", cost: 0, timing: "roll" },
  { slug: "volley", name: "Volley!", cost: 1, timing: "roll" },
  { slug: "evade", name: "Evade!", cost: 1, timing: "instant" },
  { slug: "lunar-umbra", name: "Lunar Umbra!", cost: 0, timing: "main" },
];

const BY_SLUG = new Map(CARDS.map((c) => [c.slug, c]));

export function card(slug: string): CardDef {
  const c = BY_SLUG.get(slug);
  if (!c) throw new Error(`Unknown card ${slug}`);
  return c;
}

export function cardImage(slug: string): string {
  return `/jatekok/feladvany/cards/${slug}.webp`;
}

/** Why a card can't be played at the end of the Offensive Roll Phase, or null if it can. */
export function unplayableReason(c: CardDef): string | null {
  if (c.timing === "main") return "Csak a fő fázisban játszható ki.";
  if (c.timing === "upgrade") return "Hősfejlesztés: csak a fő fázisban játszható ki.";
  if (!c.play) return "Ebben a feladványban nem segít.";
  return null;
}

export const ALL_CARDS: readonly CardDef[] = CARDS;
