// Taktikai Előny's data on the server: the heroes (name and portrait from the Szabálytár) and
// every question with its "yes" heroes. Passed to the game, which runs in the browser.

import { glossary } from "@/features/rulebook/lib/glossary";
import { COMPLEXITY_TRAITS, TOKEN_ALIASES, TOKEN_TRAITS, TRAITS, type Trait } from "./tactician-traits";

export type GameHero = { id: string; name: string; portrait: string };
export type TacticianData = { heroes: GameHero[]; traits: Trait[] };

export function tacticianData(): TacticianData {
  const { heroes } = glossary();
  const tokenTraits = Object.entries(TOKEN_TRAITS).map(([token, q]) => ({
    id: `token-${token}`,
    q,
    yes: heroes.filter((h) => [token, ...(TOKEN_ALIASES[token] ?? [])].some((t) => h.tokenIds.includes(t))).map((h) => h.id),
  }));
  const complexity = COMPLEXITY_TRAITS.map((t) => ({
    id: t.id,
    q: t.q,
    yes: heroes.filter((h) => t.test(Number(h.complexity))).map((h) => h.id),
  }));
  return {
    heroes: heroes.map((h) => ({ id: h.id, name: h.name, portrait: `/szabalytar/img/heroes/${h.id}.webp` })),
    // A question that fits a single hero only names that hero (owner, 2026-11-03): left out.
    traits: [...TRAITS, ...tokenTraits, ...complexity].filter((t) => t.yes.length >= 2),
  };
}
