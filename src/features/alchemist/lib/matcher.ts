// The Alchemist's question matcher (from reference/artifact): no AI, just Hungarian-aware
// keyword matching. Words are normalised (no accents), stop words dropped, suffixes stemmed,
// synonyms unified and typos fixed against the vocabulary; answers are ranked by TF-IDF.

import { RT_FAQ } from "@/features/rulebook/data/faq";
import { RT_HEROES } from "@/features/rulebook/data/heroes";
import { RULES } from "@/features/rulebook/data/rules";
import { RT_TOKENS } from "@/features/rulebook/data/tokens";
import type { HeroFact, TokenFact } from "@/features/rulebook/lib/glossary";
import { LEGACY_SLUGS } from "@/features/rulebook/lib/pages";
import { AQ, SITE_INTENTS } from "../data/knowledge";

/** Heroes and tokens from the Szabálytár pages (rulebook glossary), given by the chat page. */
export type Knowledge = { heroes: HeroFact[]; tokens: TokenFact[] };
let KNOWLEDGE: Knowledge | null = null;

/** Uses the Szabálytár's heroes and tokens from now on (the answers are rebuilt once). */
export function setKnowledge(k: Knowledge | null) {
  if (k === KNOWLEDGE) return;
  KNOWLEDGE = k;
  INTENTS = null;
}

const STOP = new Set("a az es is hogy mi mit mire mint van vannak nem meg de ha akkor egy en te o ti ok kell lehet tudok tudom hogyan mikor miert melyik milyen mennyi hany kerdes kerdezni kerdezem szeretnem szeretnek ez ezt azt ami amit vagy csak mar most itt ott neki nekem le fel ki be el sem se mar volna lenne lesz ugye pedig vajon olyan ilyen kerem leg legyen akar barki valaki valami minden sok csinal csinalja csinalnak mukodik mukodnek".split(" "));
const SUF = ['okkal','ekkel','akkal','ssal','ssel','nak','nek','val','vel','ban','ben','bol','rol','tol','hoz','hez','kor','ert','sal','sel','ig','ra','re','unk','ink','eim','aim','em','am','om','im','en','on','ba','be','ot','et','at','ok','ek','ak','os','es','as','ja','je','al','el','t','k','a','e'].sort((x, y) => y.length - x.length);

export const anorm = (s: string) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ");

export function astem(word: string): string {
  let w = word;
  if (w.length <= 3 || /\d/.test(w)) return w;
  for (let k = 0; k < 2; k++) {
    const s = SUF.find((x) => w.endsWith(x) && w.length - x.length >= 3);
    if (!s) break;
    w = w.slice(0, -s.length);
  }
  return w.slice(0, 7);
}

const SYN: string[][] = [['ultimate','ult','ulti','ultimet','ultit'],['cp','harcipont','penz'],['lap','kartya','kartyalap','card'],['jelzo','token','allapotjelzo','status','statusz'],['elad','eladas','eladni','sell'],['dob','dobas','roll','dobok'],['ujradob','reroll','ujradobas'],['gyogyul','heal','gyogyitas','gyogyit'],['eletero','hp','elet','health'],['sebzes','damage','sebez','sebzest'],['vedekez','vedes','defense','vedekezes'],['tamad','tamadas','attack'],['kivedhetetlen','undefendable'],['tiszta','pure'],['jarulekos','collateral'],['fejlesztes','upgrade','fejleszt'],['meccs','merkozes','match','jatszma'],['idopont','datum','ido'],['csapat','team'],['king','koth','kiraly'],['ellenfel','opponent','ellen'],['pakli','deck'],['szabaly','rule','szabalyok']].map((g) => g.map((x) => astem(anorm(x).trim())));
const SYNMAP: Record<string, string> = {};
SYN.forEach((g) => g.forEach((s) => (SYNMAP[s] = g[0])));

export const atoks = (s: string) =>
  anorm(s)
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(astem)
    .map((w) => SYNMAP[w] || w);

/** Edit distance, capped: returns 9 when the lengths differ by more than 2. */
export function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    let p = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = t;
    }
  }
  return d[b.length];
}

export type Intent = { id: string; title: string; a: string; link?: [string, string]; text: string; kw: string; st: Map<string, number> };

let INTENTS: Intent[] | null = null;
/** Hero and token names (normalised): matched as whole names, not stemmed ("Szerzetes" ≠ "szerzek"). */
let NAMES: string[] = [];

/** The normalised forms of a name: "A Hegy Ereje" → "hegy ereje"; "Miles Morales - Pókember" → also "pokember". */
function nameKeys(name: string): string[] {
  const parts = [name, ...name.split(/\s[-–]\s/)];
  return [...new Set(parts.map((p) => anorm(p).trim().replace(/\s+/g, " ").replace(/^(a|az) /, "")).filter((k) => k.length > 2))];
}

/** Names that occur in the question (short ones only as whole words, so "seb" ≠ "sebzés"). */
function namesIn(q: string): string[] {
  const n = " " + anorm(q).replace(/\s+/g, " ") + " ";
  return NAMES.filter((k) => n.includes(" " + k + (k.length <= 4 ? " " : "")));
}
let VOCAB: string[] = [];
let IDF: Record<string, number> = {};

/** All answers the Alchemist knows: rule summaries, the rules FAQ and the site intents. */
export function intents(): Intent[] {
  if (INTENTS) return INTENTS;
  const list: Intent[] = [];
  RULES.forEach((r) => {
    const x = AQ[r.id];
    if (x) list.push({ id: "r-" + r.id, title: r.t, a: x[0], link: [`/szabalytar/${LEGACY_SLUGS[r.id] ?? r.id}`, r.t], text: r.t + " " + r.en, kw: x[1], st: new Map() });
  });
  RT_FAQ.forEach(([, q, a], i) => list.push({ id: "f-" + i, title: q, a, link: ["/szabalytar/gyik", "Szabály-GYIK"], text: q, kw: "", st: new Map() }));
  SITE_INTENTS.forEach((s) => {
    const a = s.id === "s-hosok" && KNOWLEDGE ? `Jelenleg <b>${KNOWLEDGE.heroes.length} hőst</b> ismerek. ${s.a}` : s.a;
    list.push({ id: s.id, title: s.q.split(" ").slice(0, 3).join(" "), a, link: s.link, text: "", kw: s.q, st: new Map() });
  });
  const named: [Intent, string[]][] = [];
  KNOWLEDGE?.heroes.forEach((h) =>
    named.push([{
      id: "h-" + h.id,
      title: h.name,
      a: `A <b>${h.name}</b> (${h.en}) választott fegyvere: <i>${h.weapon}</i>, bonyolultsága ${h.complexity}.${h.tokens.length ? ` Jelzői: ${h.tokens.join(", ")}.` : ""} A hőslapján a szabálytisztázásokat is megtalálod.`,
      link: [h.url, `${h.name} hőslapja`],
      text: "",
      kw: "",
      st: new Map(),
    }, [h.name, h.en]]),
  );
  KNOWLEDGE?.tokens.forEach((t) => {
    const title = t.hu && t.hu !== t.name ? `${t.name} (${t.hu})` : t.name;
    const who = t.heroes.length ? ` · ${t.heroes.join(", ")}` : "";
    named.push([{
      id: "t-" + t.id,
      title,
      a: `<b>${title}</b> · ${t.stats}${who}<br>${t.summary.replace(/:$/, ".")}`,
      link: [t.url, `${title} oldala`],
      text: "",
      kw: "",
      st: new Map(),
    }, [t.name, t.hu]]);
  });
  NAMES = [];
  named.forEach(([it, names]) => {
    names.flatMap(nameKeys).forEach((k) => {
      it.st.set("@" + k, 2);
      NAMES.push(k);
    });
    list.push(it);
  });
  list.forEach((it) => {
    atoks(it.text).forEach((t) => it.st.set(t, 1));
    atoks(it.kw).forEach((t) => it.st.set(t, 1.4));
  });
  const df: Record<string, number> = {};
  list.forEach((it) => it.st.forEach((_, t) => (df[t] = (df[t] || 0) + 1)));
  VOCAB = Object.keys(df);
  IDF = {};
  VOCAB.forEach((t) => (IDF[t] = Math.log(list.length / df[t]) + 1));
  INTENTS = list;
  return list;
}

export type Entity = { kind: "hero" | "token"; name: string; url?: string };

/** Heroes and status tokens named in the question (when no answer matched well enough). */
export function entities(q: string): Entity[] {
  const n = " " + anorm(q) + " ";
  const hits: Entity[] = [];
  const heroes = KNOWLEDGE ? KNOWLEDGE.heroes.map((h) => ({ names: [h.name, h.en], name: h.name, url: h.url })) : RT_HEROES.map(([hu, en]) => ({ names: [hu, en], name: hu, url: undefined }));
  heroes.forEach((h) => {
    h.names.filter(Boolean).forEach((nm) => {
      const k = anorm(nm).trim();
      if (k.length > 2 && n.includes(" " + k.split(" ")[0])) hits.push({ kind: "hero", name: h.name, url: h.url });
    });
  });
  const qs = new Set(anorm(q).split(/\s+/).map(astem));
  const tokens = KNOWLEDGE ? KNOWLEDGE.tokens.flatMap((t) => [t.name, t.hu].filter(Boolean).map((nm) => ({ nm, name: t.hu || t.name, url: t.url }))) : RT_TOKENS.map((tk) => ({ nm: tk, name: tk, url: undefined }));
  tokens.forEach((t) => {
    const k = anorm(t.nm).trim();
    if (k.length > 3 && (n.includes(" " + k + " ") || (!k.includes(" ") && qs.has(astem(k))))) hits.push({ kind: "token", name: t.name, url: t.url });
  });
  return hits;
}

/**
 * Ranks every answer for a question. qt are the question's tokens after typo correction; a
 * result is `fuzzy` when it matched only corrected words (so it is offered, not asserted).
 */
export function match(q: string): { qt: string[]; res: { it: Intent; s: number; fuzzy: boolean }[] } {
  const all = intents();
  const corrected = new Set<string>();
  let qt = [...new Set(atoks(q))];
  qt = qt.map((t) => {
    if (IDF[t] || t.length < 4) return t;
    let best = null as string | null;
    let bd = 9;
    VOCAB.forEach((v) => {
      // Typos keep their first letter; never "correct" into a stop word (jegy → egy) or a name.
      if (v[0] !== t[0] || STOP.has(v) || v.startsWith("@")) return;
      const d = lev(t, v);
      if (d < bd) {
        bd = d;
        best = v;
      }
    });
    const fix = best;
    if (!fix || bd > (t.length >= 7 ? 2 : 1)) return t;
    // A longer or shorter form of the same stem ("idopon" → "idopont") is not a guess.
    if (!fix.startsWith(t) && !t.startsWith(fix)) corrected.add(fix);
    return fix;
  });
  qt.push(...namesIn(q).map((k) => "@" + k));
  const res = all
    .map((it) => {
      let s = 0;
      let m = 0;
      let exact = 0;
      qt.forEach((t) => {
        const w = it.st.get(t);
        if (w) {
          s += IDF[t] * w;
          m++;
          if (!corrected.has(t)) exact++;
        }
      });
      return { it, s: m ? s * (0.6 + (0.4 * m) / qt.length) : 0, fuzzy: exact === 0 };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  return { qt, res };
}
