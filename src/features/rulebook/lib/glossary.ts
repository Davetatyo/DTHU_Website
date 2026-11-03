// Short facts about every hero and token, taken from the Szabálytár pages, for helpers such as
// the Alchemist (features/alchemist) that answer questions with a link to the page.

import { allEntries, renderEntry } from "./content";
import { entryUrl } from "./pages";
import { plainText } from "./render";

export type HeroFact = {
  id: string;
  url: string;
  /** Hungarian name (the page title). */
  name: string;
  /** English name. */
  en: string;
  weapon: string;
  complexity: string;
  /** Token names as the hero page lists them, e.g. "Wound (Seb)". */
  tokens: string[];
  /** The same tokens' ids, e.g. "wound". */
  tokenIds: string[];
};

export type TokenFact = {
  id: string;
  url: string;
  /** English name (the page title). */
  name: string;
  /** Hungarian name from the Tokenek list. */
  hu: string;
  /** "Pozitív Állapotjelző | Halmozási limit: 2" */
  stats: string;
  /** The bold first line, e.g. "Gyógyulás idővel, az Állapot fázisodban:" */
  summary: string;
  /** Hungarian names of the heroes that use it. */
  heroes: string[];
};

const english = (id: string) => id.replace(/(^|-)([a-z])/g, (_, dash: string, c: string) => (dash ? " " : "") + c.toUpperCase());
const text = (re: RegExp, html: string) => plainText(re.exec(html)?.[1] ?? "");

/** Hungarian names in a list page ("hosok", "tokenek"): link URL → label. */
function listLabels(html: string): Map<string, string> {
  return new Map([...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], plainText(m[2])]));
}

/** The bold line that opens the description, or else its first paragraph or point (shortened). */
function summaryOf(html: string): string {
  const body = html
    .replace(/<p class="stats">[\s\S]*?<\/p>/, "")
    .replace(/^\s*(?:(?:<svg\b[\s\S]*?<\/svg>|<img\b[^>]*>)\s*)+/, "")
    .trim();
  const bold = text(/^<p><b>([\s\S]*?)<\/b>/, body);
  if (bold) return bold;
  const first = text(/<(?:p|li)>(?!<b>)([\s\S]*?)<\/(?:p|li)>/, body);
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}

let cache: { heroes: HeroFact[]; tokens: TokenFact[] } | null = null;

export function glossary(): { heroes: HeroFact[]; tokens: TokenFact[] } {
  if (cache) return cache;
  const entries = allEntries();
  const heroes = entries
    .filter((r) => r.kind === "hero")
    .map((ref) => {
      const e = renderEntry(ref);
      const tokenList = /<h3>[^<]*Tokenek[^<]*<\/h3>\s*<ul class="grid tokens">([\s\S]*?)<\/ul>/.exec(e.bodyHtml)?.[1] ?? "";
      return {
        id: ref.id,
        url: entryUrl(ref),
        name: e.title,
        en: english(ref.id),
        weapon: text(/<dfn>Választott fegyver:<\/dfn>([\s\S]*?)<\/p>/, e.bodyHtml),
        complexity: /alt="Bonyolultság (\d+)"/.exec(e.bodyHtml)?.[1] ?? "",
        tokens: [...tokenList.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((m) => plainText(m[1])),
        tokenIds: [...tokenList.matchAll(/<a\b[^>]*href="\/szabalytar\/tokenek\/([^"]+)"/g)].map((m) => m[1]),
      };
    });
  const tokenNames = listLabels(renderEntry({ kind: "rule", id: "tokens" }).bodyHtml);
  const tokens = entries
    .filter((r) => r.kind === "token")
    .map((ref) => {
      const e = renderEntry(ref);
      const url = entryUrl(ref);
      return {
        id: ref.id,
        url,
        name: e.title,
        hu: tokenNames.get(url) ?? "",
        stats: text(/<p class="stats">([\s\S]*?)<\/p>/, e.bodyHtml),
        summary: summaryOf(e.bodyHtml),
        heroes: [...(e.seeAlsoHtml ?? "").matchAll(/<a\b[^>]*href="\/szabalytar\/hosok\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => plainText(m[1])),
      };
    });
  cache = { heroes, tokens };
  return cache;
}
