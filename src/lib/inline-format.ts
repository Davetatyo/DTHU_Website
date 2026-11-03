// Inline formatting inside paragraphs, lists, quotes and boxes: **bold**, *italic* and
// [label](https://link). Stored as plain text with these marks and turned into React elements
// when shown, never into HTML, so nothing typed can run as code. Pure, unit-tested.

import { safeUrl } from "./publishing";

export type InlineSegment =
  | { t: "text"; text: string }
  | { t: "b"; text: string }
  | { t: "i"; text: string }
  | { t: "a"; text: string; href: string };

// One token at a time: a link, bold, or italic. Text between tokens is plain.
const TOKEN = /\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*/g;

export function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ t: "text", text: text.slice(last, at) });
    if (m[1] !== undefined) {
      const href = safeUrl(m[2]);
      out.push(href ? { t: "a", text: m[1], href } : { t: "text", text: m[0] });
    } else if (m[3] !== undefined) {
      out.push({ t: "b", text: m[3] });
    } else {
      out.push({ t: "i", text: m[4] });
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", text: text.slice(last) });
  return out;
}

/** The text without formatting marks (e.g. for share previews). */
export function stripInline(text: string): string {
  return parseInline(text)
    .map((s) => s.text)
    .join("");
}
