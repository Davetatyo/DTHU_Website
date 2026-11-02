// Szabálytár content on the server: reads the RulePop files in content/ (kept in memory after
// the first read) and renders them with lib/render.ts.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { entryPath, entryUrl, refForTarget, RULE_PAGES, type EntryKind, type EntryRef, type EntryWidth, type KnownIds } from "./pages";
import { applyRelevance, defaultFlags, plainText, resolveLinks, splitEntry } from "./render";

const DIR = join(process.cwd(), "src/features/rulebook/content");
const FOLDER: Record<EntryKind, string> = { rule: "rules", hero: "hero", token: "token" };

/** What a page or popup needs to show one entry. */
export type RenderedEntry = {
  path: string;
  title: string;
  titleHtml: string;
  seeAlsoHtml: string | null;
  bodyHtml: string;
  width: EntryWidth;
};

const ids = (kind: EntryKind) =>
  readdirSync(join(DIR, FOLDER[kind]))
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.slice(0, -5))
    .sort();

let known: KnownIds | null = null;
export function knownIds(): KnownIds {
  known ??= { heroes: new Set(ids("hero")), tokens: new Set(ids("token")) };
  return known;
}

/** Every entry: rules (in table order), heroes, tokens. */
export function allEntries(): EntryRef[] {
  const k = knownIds();
  return [
    ...Object.keys(RULE_PAGES).map((id) => ({ kind: "rule" as const, id })),
    ...[...k.heroes].map((id) => ({ kind: "hero" as const, id })),
    ...[...k.tokens].map((id) => ({ kind: "token" as const, id })),
  ];
}

const cache = new Map<string, RenderedEntry>();

export function renderEntry(ref: EntryRef): RenderedEntry {
  const path = entryPath(ref);
  const hit = cache.get(path);
  if (hit) return hit;
  const raw = readFileSync(join(DIR, FOLDER[ref.kind], `${ref.id}.html`), "utf8");
  const k = knownIds();
  const link = (html: string) =>
    resolveLinks(html, (target) => {
      const to = refForTarget(target, k);
      return to ? entryUrl(to) : null;
    });
  const parts = splitEntry(raw);
  const entry: RenderedEntry = {
    path,
    title: plainText(parts.titleHtml),
    titleHtml: parts.titleHtml,
    seeAlsoHtml: parts.seeAlsoHtml && link(parts.seeAlsoHtml),
    bodyHtml: applyRelevance(link(parts.bodyHtml), defaultFlags(parts.bodyHtml)),
    width: ref.kind === "rule" ? (RULE_PAGES[ref.id].width ?? "normal") : "normal",
  };
  cache.set(path, entry);
  return entry;
}

/** Short description for link previews: the first paragraph's text. */
export function entryDescription(entry: RenderedEntry): string {
  const p = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(entry.bodyHtml);
  const text = p ? plainText(p[1]) : "";
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}
