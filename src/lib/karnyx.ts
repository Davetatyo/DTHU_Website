// Parser for text copied from a Karnyx round view.
//
// Karnyx lists every player as three hero avatar lines ("Ninja Avatar") followed by the
// player's nickname. Players next to each other are opponents (1v2, 3v4, ...). Blank lines
// and the per-viewer buttons Karnyx shows next to the copying admin's own match are noise.

export type ParsedPlayer = { name: string; heroes: string[] };

export type ParsedPairing = {
  tableNo: number;
  a: ParsedPlayer;
  b: ParsedPlayer | null; // null = bye (odd number of players)
};

export type ParseResult = {
  players: ParsedPlayer[];
  pairings: ParsedPairing[];
  warnings: string[];
};

const AVATAR_SUFFIX = /\s+avatar$/i;
const EXPECTED_HEROES = 3;

export function parseKarnyxPaste(text: string): ParseResult {
  const players: ParsedPlayer[] = [];
  const warnings: string[] = [];
  let heroes: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (AVATAR_SUFFIX.test(line)) {
      heroes.push(line.replace(AVATAR_SUFFIX, "").trim());
      continue;
    }

    // A name without any hero avatars before it is button text or other noise.
    if (heroes.length === 0) {
      warnings.push(`Kihagyott sor (nincs előtte hős): „${line}”`);
      continue;
    }

    if (heroes.length !== EXPECTED_HEROES) {
      warnings.push(`${line}: ${heroes.length} hős szerepel ${EXPECTED_HEROES} helyett`);
    }
    players.push({ name: line, heroes });
    heroes = [];
  }

  if (heroes.length > 0) {
    warnings.push(`A szöveg végén ${heroes.length} hős áll játékosnév nélkül`);
  }

  const seen = new Set<string>();
  for (const p of players) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) warnings.push(`${p.name} többször szerepel`);
    seen.add(key);
  }

  const pairings: ParsedPairing[] = [];
  for (let i = 0; i < players.length; i += 2) {
    pairings.push({ tableNo: i / 2 + 1, a: players[i], b: players[i + 1] ?? null });
  }
  if (players.length % 2 === 1) {
    warnings.push(`Páratlan létszám: ${players[players.length - 1].name} erőnyerő (bye)`);
  }

  return { players, pairings, warnings };
}
