// Rulebook search: accent-insensitive substring search over rules, the rules FAQ, heroes and tokens.

import { RT_FAQ } from "../data/faq";
import { RT_HEROES } from "../data/heroes";
import { RT_TABS, RULES } from "../data/rules";
import { RT_TOKENS } from "../data/tokens";

export const norm = (s: string) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const stripTags = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export type Hit = { href: string; t: string; k: string; s: string };

export function searchRules(q: string): Hit[] {
  const n = norm(q);
  if (n.length < 2) return [];
  const hits: Hit[] = [];
  RULES.forEach((r) => {
    const txt = stripTags(r.b);
    if (norm(`${r.t} ${r.en} ${txt}`).includes(n)) {
      const i = norm(txt).indexOf(n);
      hits.push({
        href: `/szabalytar/${r.id}`,
        t: r.t,
        k: RT_TABS.find((x) => x[0] === r.cat)?.[1] ?? "",
        s: i >= 0 ? `…${txt.slice(Math.max(0, i - 50), i + 90)}…` : r.en,
      });
    }
  });
  RT_FAQ.forEach(([, q2, a]) => {
    if (norm(`${q2} ${a}`).includes(n)) hits.push({ href: "/szabalytar?tab=gyik", t: q2, k: "Szabály-GYIK", s: a });
  });
  RT_HEROES.forEach(([hu, en]) => {
    if (norm(`${hu} ${en}`).includes(n)) hits.push({ href: "/szabalytar?tab=hosok", t: hu, k: "Hős", s: en });
  });
  RT_TOKENS.forEach((tk) => {
    if (norm(tk).includes(n)) hits.push({ href: "/szabalytar?tab=jelzok", t: tk, k: "Állapotjelző", s: "" });
  });
  return hits.sort((x, y) => Number(norm(y.t).includes(n)) - Number(norm(x.t).includes(n)));
}

/** Alphabetical index of rule titles (Hungarian and English) and key terms. */
export function ruleIndex(): [string, [string, string][]][] {
  const items: [string, string][] = [
    ...RULES.map((r): [string, string] => [r.t, `/szabalytar/${r.id}`]),
    ...RULES.map((r): [string, string] => [`${r.en} (angol)`, `/szabalytar/${r.id}`]),
    ["Komplexitási szint", "/szabalytar/fogalmak"],
    ["Választott játékos", "/szabalytar/fogalmak"],
    ["Választott ellenfél", "/szabalytar/fogalmak"],
    ["Halmozási limit", "/szabalytar/allapotjelzok"],
    ["Vezető (King of the Hill)", "/szabalytar/kingofthehill"],
    ["Kézlimit", "/szabalytar/eldobas"],
    ["Kivédhetetlen sebzés", "/szabalytar/sebzestipusok"],
    ["Tiszta sebzés", "/szabalytar/sebzestipusok"],
    ["Járulékos sebzés", "/szabalytar/sebzestipusok"],
    ["Kerekítés", "/szabalytar/vegso-sebzes"],
    ["Lap eladása", "/szabalytar/cp"],
    ["Hősök listája", "/szabalytar?tab=hosok"],
    ["Állapotjelzők listája", "/szabalytar?tab=jelzok"],
  ];
  items.sort((a, b) => a[0].localeCompare(b[0], "hu"));
  const groups = new Map<string, [string, string][]>();
  items.forEach(([t, h]) => {
    const l = t[0].toUpperCase();
    groups.set(l, [...(groups.get(l) ?? []), [t, h]]);
  });
  return [...groups.entries()];
}
