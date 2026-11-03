// Turns a RulePop content file into what the Szabálytár shows: the title and "see also" links
// are split off, "#id" links become Szabálytár URLs (or plain text while their page doesn't
// exist yet), and "dynamic rules" (data-relevance) start in their default state.
// Pure string functions: the content is our own trusted HTML (see scripts/rulebook/).

export type EntryParts = { titleHtml: string; seeAlsoHtml: string | null; bodyHtml: string };

/** Splits off <h2 slot="header"> and <ul slot="header" class="see-also">. */
export function splitEntry(html: string): EntryParts {
  const h2 = /<h2 slot="header"[^>]*>([\s\S]*?)<\/h2>/.exec(html);
  const see = /<ul slot="header" class="see-also">([\s\S]*?)<\/ul>/.exec(html);
  let body = html;
  for (const m of [h2, see]) if (m) body = body.replace(m[0], "");
  return { titleHtml: h2?.[1].trim() ?? "", seeAlsoHtml: see?.[1].trim() || null, bodyHtml: body.trim() };
}

export const plainText = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/ ([:.,;!?)])/g, "$1")
    .trim();

/**
 * Rewrites <a href="#target"> links with `resolve` (target → URL). Targets without a page
 * (yet) become <span class="rp-missing" data-target="…">, so the text stays readable.
 */
export function resolveLinks(html: string, resolve: (target: string) => string | null): string {
  return html.replace(/<a\b([^>]*?)\shref="#([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (_, pre: string, target: string, post: string, inner: string) => {
    const url = target ? resolve(target) : null;
    return url ? `<a${pre} href="${url}"${post}>${inner}</a>` : `<span class="rp-missing" data-target="${target}">${inner}</span>`;
  });
}

/** Targets of the links that have no page, e.g. ["ability", "sell"]. */
export function missingTargets(html: string): string[] {
  return [...html.matchAll(/class="rp-missing" data-target="([^"]*)"/g)].map((m) => m[1]);
}

/**
 * Evaluates a RulePop relevance expression ("h-all || h-bar", "m-2v2 || m-koh") against the
 * active flags. Only flags, ||, &&, ! and brackets are allowed (no eval).
 */
export function isRelevant(expr: string, active: ReadonlySet<string>): boolean {
  const tokens = expr.match(/\|\||&&|!|\(|\)|[\w-]+/g) ?? [];
  let i = 0;
  const or = (): boolean => {
    let v = and();
    while (tokens[i] === "||") {
      i++;
      v = and() || v;
    }
    return v;
  };
  const and = (): boolean => {
    let v = not();
    while (tokens[i] === "&&") {
      i++;
      v = not() && v;
    }
    return v;
  };
  const not = (): boolean => {
    if (tokens[i] === "!") {
      i++;
      return !not();
    }
    if (tokens[i] === "(") {
      i++;
      const v = or();
      i++;
      return v;
    }
    const t = tokens[i++];
    if (t === "or" || t === "and") return false;
    return t !== undefined && active.has(t);
  };
  return tokens.length === 0 ? true : or();
}

/** The flags RulePop starts with: versus game, all heroes, and every pre-checked choice. */
export function defaultFlags(html: string): Set<string> {
  const flags = new Set(["g-vs", "h-all"]);
  for (const m of html.matchAll(/<input\b[^>]*>/g)) {
    const value = /\svalue="([^"]*)"/.exec(m[0])?.[1];
    if (value && /\schecked\b/.test(m[0]) && /type="radio"/.test(m[0])) flags.add(value);
  }
  return flags;
}

/** Marks elements whose relevance is false with `hidden` (server-side first view). */
export function applyRelevance(html: string, active: ReadonlySet<string>): string {
  return html.replace(/\sdata-relevance="([^"]*)"/g, (m, expr: string) => (isRelevant(expr, active) ? m : `${m} hidden`));
}
