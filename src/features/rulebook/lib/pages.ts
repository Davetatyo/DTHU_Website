// Which RulePop entry lives at which Szabálytár URL. The content files keep RulePop's own ids
// and "#id" links (content/rules/<id>.html, content/hero/<id>.html, content/token/<id>.html);
// this table gives each a Hungarian address under /szabalytar.

export type EntryKind = "rule" | "hero" | "token";
export type EntryWidth = "normal" | "wide" | "max";
export type EntryRef = { kind: EntryKind; id: string };

export const RULEBOOK_PATH = "/szabalytar";
export const HERO_DIR = "hosok";
export const TOKEN_DIR = "tokenek";

/** RulePop section id → slug and popup width. */
export const RULE_PAGES: Record<string, { slug: string; width?: EntryWidth }> = {
  about: { slug: "nevjegy" },
  turns: { slug: "korok" },
  setup: { slug: "elokeszites", width: "wide" },
  "upkeep-phase": { slug: "allapot-fazis" },
  "income-phase": { slug: "beveteli-fazis" },
  "main-phase": { slug: "erosito-fazis" },
  "offensive-roll-phase": { slug: "tamado-dobasi-fazis" },
  "defensive-roll-phase": { slug: "vedekezo-dobasi-fazis" },
  "targeting-roll-phase": { slug: "celzo-dobasi-fazis" },
  "discard-phase": { slug: "eldobasi-fazis" },
  "action-cards": { slug: "akciolapok" },
  "attack-modifiers": { slug: "tamadasmodositok" },
  "combat-points": { slug: "harci-pontok" },
  companions: { slug: "tarsak" },
  "damage-types": { slug: "sebzestipusok" },
  health: { slug: "eletero" },
  heroes: { slug: HERO_DIR, width: "max" },
  "hero-board": { slug: "hostabla", width: "wide" },
  "hero-cards": { slug: "hoskartyak" },
  "hero-leaflet": { slug: "hosleiras" },
  "hero-upgrades": { slug: "hosfejlesztesek" },
  tokens: { slug: TOKEN_DIR, width: "max" },
  "status-effects": { slug: "allapotjelzok", width: "wide" },
  damage: { slug: "sebzestablazat", width: "max" },
  "final-dmg-total": { slug: "vegso-sebzes" },
  "final-dice-result": { slug: "vegso-dobas" },
  "offensive-ability": { slug: "tamado-kepesseg" },
  "defensive-ability": { slug: "vedekezo-kepesseg" },
  "passive-ability": { slug: "passziv-kepesseg" },
  "ultimate-ability": { slug: "ultimate-kepesseg" },
  attack: { slug: "tamadas" },
  "resolving-text": { slug: "szovegek-vegrehajtasa" },
  timing: { slug: "idozites" },
  "game-modes": { slug: "jatekmodok" },
  faq: { slug: "gyik" },
  "link-to-rule": { slug: "hivatkozas" },
};

/** The two button groups of the Szabálytár home page (as on RulePop): [label, section id]. */
export const HOME_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Gyors segédlet",
    items: [["Körök", "turns"], ["Hősök", "heroes"], ["Tokenek", "tokens"], ["Sebzés", "damage"], ["Felállítás", "setup"], ["GYIK", "faq"]],
  },
  {
    title: "Részletes szabályok",
    items: [
      ["Akciólapok", "action-cards"],
      ["Támadásmódosítók", "attack-modifiers"],
      ["Harci Pontok", "combat-points"],
      ["Társak", "companions"],
      ["Sebzéstípusok", "damage-types"],
      ["Védelmi dobás", "defensive-roll-phase"],
      ["Eldobás", "discard-phase"],
      ["Végső sebzés", "final-dmg-total"],
      ["Játékmódok", "game-modes"],
      ["Életpontok", "health"],
      ["Hős tábla", "hero-board"],
      ["Hős lapok", "hero-cards"],
      ["Hős kiskönyv", "hero-leaflet"],
      ["Hős fejlesztések", "hero-upgrades"],
      ["Bevétel", "income-phase"],
      ["Erősítő fázis", "main-phase"],
      ["Támadó dobás", "offensive-roll-phase"],
      ["Szövegértelmezés", "resolving-text"],
      ["Állapotjelzők", "status-effects"],
      ["Célzó dobás", "targeting-roll-phase"],
      ["Időzítés", "timing"],
      ["Fenntartás", "upkeep-phase"],
    ],
  },
];

/**
 * Addresses of the earlier Szabálytár preview (admins only, still used by the Alchemist's
 * answers) → today's entry. Anything not listed falls back to the Szabálytár home.
 */
export const LEGACY_SLUGS: Record<string, string> = {
  kor: "korok",
  gyozelem: "eletero",
  fogalmak: "gyik",
  akciokartyak: "akciolapok",
  cp: "harci-pontok",
  vedekezo: "vedekezo-dobasi-fazis",
  eldobas: "eldobasi-fazis",
  fejlesztesek: "hosfejlesztesek",
  bevetel: "beveteli-fazis",
  fofazis: "erosito-fazis",
  tamado: "tamado-dobasi-fazis",
  szovegek: "szovegek-vegrehajtasa",
  celzo: "celzo-dobasi-fazis",
  fenntartas: "allapot-fazis",
  ultimate: "ultimate-kepesseg",
  "1v1": "jatekmodok",
  kingofthehill: "jatekmodok",
  "2v2": "jatekmodok",
  "3v3": "jatekmodok",
  "2v2v2": "jatekmodok",
  "lista-hosok": HERO_DIR,
  "lista-jelzok": TOKEN_DIR,
  "gyik-szabaly": "gyik",
};

/** Old "?tab=" addresses of the preview home → entry slug. */
export const LEGACY_TABS: Record<string, string> = { hosok: HERO_DIR, jelzok: TOKEN_DIR, gyik: "gyik", modok: "jatekmodok" };

const SLUG_TO_RULE = new Map(Object.entries(RULE_PAGES).map(([id, p]) => [p.slug, id]));

/** Known hero and token ids (the files in content/hero and content/token). */
export type KnownIds = { heroes: ReadonlySet<string>; tokens: ReadonlySet<string> };

/** The path under /szabalytar of an entry (without the leading /szabalytar/). */
export function entryPath(ref: EntryRef): string {
  if (ref.kind === "hero") return `${HERO_DIR}/${ref.id}`;
  if (ref.kind === "token") return `${TOKEN_DIR}/${ref.id}`;
  return RULE_PAGES[ref.id].slug;
}

export const entryUrl = (ref: EntryRef) => `${RULEBOOK_PATH}/${entryPath(ref)}`;

/** Which entry a RulePop link target ("setup", "hero/barbarian", "token/burn") points to. */
export function refForTarget(target: string, known: KnownIds): EntryRef | null {
  const [head, id] = target.split("/");
  if (head === "hero" && id && known.heroes.has(id)) return { kind: "hero", id };
  if (head === "token" && id && known.tokens.has(id)) return { kind: "token", id };
  if (!id && RULE_PAGES[head]) return { kind: "rule", id: head };
  return null;
}

/** Which entry a Szabálytár path ("korok", "hosok/barbarian") shows. */
export function refForPath(segments: string[], known: KnownIds): EntryRef | null {
  if (segments.length === 2 && segments[0] === HERO_DIR) return known.heroes.has(segments[1]) ? { kind: "hero", id: segments[1] } : null;
  if (segments.length === 2 && segments[0] === TOKEN_DIR) return known.tokens.has(segments[1]) ? { kind: "token", id: segments[1] } : null;
  if (segments.length !== 1) return null;
  const id = SLUG_TO_RULE.get(segments[0]);
  return id ? { kind: "rule", id } : null;
}
