// Hero colours and artwork for avatars and picture tiles. Hero names come from Karnyx in English.
// Heroes without artwork get a gradient in their colours; unknown heroes get a stable colour
// derived from the name. Add artwork by dropping a file in public/images and listing it here.

const COLORS: Record<string, [string, string]> = {
  Barbarian: ["#c8452f", "#6b1d12"],
  "Moon Elf": ["#4f8fe0", "#1b2f66"],
  "Sun Elf": ["#f2c14e", "#7a4a10"],
  Pyromancer: ["#f07a22", "#7a1d0c"],
  "Shadow Thief": ["#8b55d6", "#2a1648"],
  Monk: ["#d9a75a", "#5a3a17"],
  Paladin: ["#d8dde4", "#7a6420"],
  Ninja: ["#5e6b7a", "#141a22"],
  Treant: ["#5eae4a", "#1d3d18"],
  Druid: ["#6fbf5a", "#1f3d1a"],
  Gunslinger: ["#c58a4a", "#4a2a12"],
  Samurai: ["#d23a4a", "#3a0d16"],
  Tactician: ["#7c95ad", "#1d2a38"],
  Huntress: ["#3fb39a", "#0f3a33"],
  "Cursed Pirate": ["#4fb0a6", "#16303a"],
  Artificer: ["#d08a52", "#3a2414"],
  Forgemaster: ["#e0763a", "#3a1a0c"],
  Seraph: ["#f2e3a6", "#6a5a2a"],
  "Vampire Lord": ["#a3223a", "#24060e"],
  Necromancer: ["#7fd18b", "#1a2a1c"],
  "Pale Lady": ["#cfd6e6", "#3a3f55"],
  "Headless Horseman": ["#f0862a", "#2a1608"],
  Raveness: ["#5a4a8a", "#120c22"],
  "Mystic Brawler": ["#e35a8a", "#3a0f22"],
  Alchemist: ["#b06ae0", "#2a1238"],
  Santa: ["#e04848", "#1d4a2a"],
  Krampus: ["#7a5a4a", "#140c0a"],
  "Spider-Man": ["#d8333a", "#1c2f78"],
  "Black Widow": ["#c42a2a", "#141414"],
  "Black Panther": ["#7b5cd6", "#141020"],
  Gambit: ["#d64a9a", "#2a1030"],
  Psylocke: ["#9a4ae0", "#1a1038"],
  Loki: ["#3fae5a", "#c9a227"],
  Iceman: ["#9ed8f5", "#1d4a78"],
  Storm: ["#e6e9f2", "#3a4a78"],
  "Doctor Strange": ["#d8483a", "#1d3a78"],
  Thor: ["#5a8ad6", "#c9c9d6"],
  Deadpool: ["#c82a2a", "#1a1a1a"],
  Cyclops: ["#e0b22a", "#1a2a5a"],
  "Jean Grey": ["#3fae6a", "#a8202a"],
  "Captain Marvel": ["#d8323a", "#1d3a8a"],
  "Scarlet Witch": ["#c8204a", "#3a0a1a"],
  Rogue: ["#3fae5a", "#c9a227"],
};

const IMAGES: Record<string, string> = {
  Barbarian: "/images/barb.webp",
  Paladin: "/images/pala.webp",
  Alchemist: "/images/alchemist.webp",
};

function hash(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** [light, dark] colour pair for a hero; stable fallback for heroes not listed. */
export function heroColors(hero: string | null | undefined): [string, string] {
  if (hero && COLORS[hero]) return COLORS[hero];
  const h = hash(hero ?? "?") % 360;
  return [`hsl(${h} 55% 55%)`, `hsl(${h} 45% 18%)`];
}

export function heroImage(hero: string | null | undefined): string | undefined {
  return hero ? IMAGES[hero] : undefined;
}
