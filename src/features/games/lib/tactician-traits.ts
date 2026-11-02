// Taktikai Előny: the yes/no questions the Hadvezér can ask, and which heroes are a "yes".
// Hero ids are the Szabálytár's (content/hero/<id>.html). Token questions are filled from the
// Szabálytár (lib/tactician-data.ts); the rest is written by hand. The owner reviews this
// table: one wrong cell makes the Hadvezér guess wrong (the game tolerates a single wrong
// answer, but not a wrong table).

export type Trait = {
  id: string;
  /** The question, as the Hadvezér asks it. */
  q: string;
  /** Hero ids for which the answer is "Igen". */
  yes: string[];
};

/** Hand-written traits. */
export const TRAITS: Trait[] = [
  {
    id: "marvel",
    q: "A hősöd a Marvel-univerzumból érkezett?",
    yes: ["black-panther", "black-widow", "captain-marvel", "cyclops", "deadpool", "doctor-strange", "gambit", "iceman", "jean-grey", "loki", "psylocke", "rogue", "scarlet-witch", "spider-man", "storm", "thor", "wolverine"],
  },
  {
    id: "x-men",
    q: "Az X-Men csapatának tagja?",
    yes: ["cyclops", "gambit", "iceman", "jean-grey", "psylocke", "rogue", "storm", "wolverine"],
  },
  {
    id: "woman",
    q: "A hősöd nő?",
    yes: ["black-widow", "captain-marvel", "huntress", "jean-grey", "moon-elf", "pale-lady", "psylocke", "raveness", "rogue", "scarlet-witch", "seraph", "storm", "sun-elf"],
  },
  {
    id: "season-1",
    q: "Az első évad (Season One) eredeti nyolc hősének egyike?",
    yes: ["barbarian", "monk", "moon-elf", "ninja", "paladin", "pyromancer", "shadow-thief", "treant"],
  },
  {
    id: "season-2",
    q: "A második évad (Season Two) hőseinek egyike?",
    yes: ["artificer", "cursed-pirate", "gunslinger", "huntress", "samurai", "seraph", "tactician", "vampire-lord"],
  },
  {
    id: "holiday",
    q: "Ünnepi, karácsonyi hős?",
    yes: ["krampus", "santa"],
  },
  {
    id: "dark",
    q: "Sötét teremtmény: élőholt, vámpír, átkozott vagy rémalak?",
    yes: ["cursed-pirate", "headless-horseman", "krampus", "necromancer", "pale-lady", "vampire-lord"],
  },
  {
    id: "divine",
    q: "Isten, angyal vagy isteni lény?",
    yes: ["loki", "seraph", "thor"],
  },
  {
    id: "elf",
    q: "Tündér (elf) a hősöd?",
    yes: ["moon-elf", "sun-elf"],
  },
  {
    id: "magic",
    q: "Varázslattal vagy misztikus erőkkel harcol?",
    yes: ["doctor-strange", "druid", "loki", "moon-elf", "mystic-brawler", "necromancer", "pyromancer", "raveness", "scarlet-witch", "seraph", "sun-elf"],
  },
  {
    id: "mind",
    q: "Az elme erejével, pszichikai képességekkel harcol?",
    yes: ["jean-grey", "psylocke"],
  },
  {
    id: "elements",
    q: "Tüzet, jeget vagy időjárást irányít?",
    yes: ["iceman", "jean-grey", "pyromancer", "storm"],
  },
  {
    id: "ranged",
    q: "Főleg távolról támad (íj, pisztoly, sugár, dobott lap)?",
    yes: ["captain-marvel", "cyclops", "gambit", "gunslinger", "iceman", "moon-elf", "spider-man", "storm"],
  },
  {
    id: "blade",
    q: "Pengével harcol: karddal, tőrrel, katanával vagy szablyával?",
    yes: ["cursed-pirate", "deadpool", "duelist", "ninja", "paladin", "psylocke", "samurai", "seraph", "shadow-thief", "tactician"],
  },
  {
    id: "claws",
    q: "Karmokkal harcol?",
    yes: ["black-panther", "pale-lady", "vampire-lord", "wolverine"],
  },
  {
    id: "fists",
    q: "Puszta kézzel, ököllel harcol?",
    yes: ["monk", "mystic-brawler"],
  },
  {
    id: "beast",
    q: "Állat a társa, vagy állattá változik?",
    yes: ["druid", "huntress", "raveness"],
  },
  {
    id: "army",
    q: "Saját sereget, robotokat vagy szellemeket hív a csatába?",
    yes: ["artificer", "necromancer", "treant"],
  },
  {
    id: "nature",
    q: "A természet, az erdő ereje van vele?",
    yes: ["druid", "treant"],
  },
  {
    id: "flies",
    q: "Tud repülni?",
    yes: ["captain-marvel", "rogue", "seraph", "storm", "thor"],
  },
  {
    id: "armored",
    q: "Nehéz páncélt visel?",
    yes: ["forgemaster", "paladin"],
  },
  {
    id: "royal",
    q: "Uralkodó, király, herceg vagy úr?",
    yes: ["black-panther", "loki", "thor", "vampire-lord"],
  },
  {
    id: "leader",
    q: "Hadvezér típus: csapatot vezet és terveket sző?",
    yes: ["cyclops", "tactician"],
  },
  {
    id: "rage",
    q: "Dühbe gurul, vadul ront az ellenfelére?",
    yes: ["barbarian", "wolverine"],
  },
  {
    id: "jokester",
    q: "Laza, viccelődő figura?",
    yes: ["deadpool", "iceman", "spider-man"],
  },
  {
    id: "horse",
    q: "Lóháton jár?",
    yes: ["headless-horseman"],
  },
  {
    id: "cards",
    q: "Kártyákkal harcol?",
    yes: ["gambit"],
  },
  {
    id: "web",
    q: "Hálót lő?",
    yes: ["spider-man"],
  },
  {
    id: "hammer",
    q: "Pörölyt forgat?",
    yes: ["thor"],
  },
];

/**
 * Token questions: "Tud <token> jelzőt használni?" for tokens that two or more heroes share
 * (they split the field well). Filled from the Szabálytár; listed here so the owner can see
 * them: token id → question.
 */
export const TOKEN_TRAITS: Record<string, string> = {
  poison: "Tud mérget okozni (Poison)?",
  bleed: "Okoz vérzést (Bleed)?",
  evasive: "Ki tud térni a támadások elől (Evasive)?",
  knockdown: "Földre tudja vinni az ellenfelét (Knockdown)?",
  stun: "Tudja kábítani az ellenfelét (Stun)?",
  protect: "Tudja védeni magát vagy a társait (Protect)?",
  cleanse: "Meg tud tisztulni a rossz jelzőktől (Cleanse)?",
  targeted: "Meg tudja jelölni a célpontját (Targeted)?",
  agility: "Fürgeséggel (Agility) tér ki?",
  concussion: "Okoz agyrázkódást (Concussion)?",
  "guard-break": "Át tudja törni az ellenfél védelmét (Guard Break)?",
  "blessing-of-divinity": "Isteni áldás (Blessing of Divinity) óvja?",
};

/** Complexity questions (from the Szabálytár's hero pages). */
export const COMPLEXITY_TRAITS: { id: string; q: string; test: (c: number) => boolean }[] = [
  { id: "complexity-low", q: "Kezdőbarát hős (1-es vagy 2-es bonyolultság)?", test: (c) => c <= 2 },
  { id: "complexity-high", q: "Legalább 4-es a bonyolultsága?", test: (c) => c >= 4 },
  { id: "complexity-max", q: "A legbonyolultabbak közé tartozik (5-ös vagy 6-os)?", test: (c) => c >= 5 },
];
