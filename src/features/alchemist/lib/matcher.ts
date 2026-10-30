// The Alchemist's question matcher (from reference/artifact): no AI, just Hungarian-aware
// keyword matching. Words are normalised (no accents), stop words dropped, suffixes stemmed,
// synonyms unified and typos fixed against the vocabulary; answers are ranked by TF-IDF.

import { RT_FAQ } from "@/features/rulebook/data/faq";
import { RT_HEROES } from "@/features/rulebook/data/heroes";
import { RULES } from "@/features/rulebook/data/rules";
import { RT_TOKENS } from "@/features/rulebook/data/tokens";
import { AQ, SITE_INTENTS } from "../data/knowledge";

const STOP = new Set("a az es is hogy mi mit mire mint van vannak nem meg de ha akkor egy en te o ti ok kell lehet tudok tudom hogyan mikor miert melyik milyen mennyi hany kerdes kerdezni kerdezem szeretnem szeretnek ez ezt azt ami amit vagy csak mar most itt ott neki nekem le fel ki be el sem se mar volna lenne lesz ugye pedig vajon olyan ilyen kerem leg legyen akar barki valaki valami minden sok".split(" "));
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

const SYN: string[][] = [['ultimate','ult','ulti','ultimet','ultit'],['cp','harcipont','penz'],['lap','kartya','kartyalap','card'],['jelzo','token','allapotjelzo','status','statusz'],['elad','eladas','eladni','sell'],['dob','dobas','roll','dobok'],['ujradob','reroll','ujradobas'],['gyogyul','heal','gyogyitas','gyogyit'],['eletero','hp','elet','health'],['sebzes','damage','sebez','sebzest'],['vedekez','vedes','defense','vedekezes'],['tamad','tamadas','attack'],['kivedhetetlen','undefendable'],['tiszta','pure'],['jarulekos','collateral'],['fejlesztes','upgrade','fejleszt'],['jegy','ticket'],['bolt','shop','vasarol'],['meccs','merkozes','match','jatszma'],['idopont','datum','ido'],['csapat','team'],['king','koth','kiraly'],['ellenfel','opponent','ellen'],['pakli','deck'],['szabaly','rule','szabalyok']].map((g) => g.map((x) => astem(anorm(x).trim())));
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
let VOCAB: string[] = [];
let IDF: Record<string, number> = {};

/** All answers the Alchemist knows: rule summaries, the rules FAQ and the site intents. */
export function intents(): Intent[] {
  if (INTENTS) return INTENTS;
  const list: Intent[] = [];
  RULES.forEach((r) => {
    const x = AQ[r.id];
    if (x) list.push({ id: "r-" + r.id, title: r.t, a: x[0], link: [`/szabalytar/${r.id}`, r.t], text: r.t + " " + r.en, kw: x[1], st: new Map() });
  });
  RT_FAQ.forEach(([, q, a], i) => list.push({ id: "f-" + i, title: q, a, link: ["/szabalytar?tab=gyik", "Szabály-GYIK"], text: q, kw: "", st: new Map() }));
  SITE_INTENTS.forEach((s) => list.push({ id: s.id, title: s.q.split(" ").slice(0, 3).join(" "), a: s.a, link: s.link, text: "", kw: s.q, st: new Map() }));
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

/** Heroes and status tokens named in the question (for "not written yet" answers). */
export function entities(q: string): { kind: "hero" | "token"; name: string }[] {
  const n = " " + anorm(q) + " ";
  const hits: { kind: "hero" | "token"; name: string }[] = [];
  RT_HEROES.forEach(([hu, en]) => {
    [hu, en].filter(Boolean).forEach((nm) => {
      const k = anorm(nm).trim();
      if (k.length > 2 && n.includes(" " + k.split(" ")[0])) hits.push({ kind: "hero", name: hu });
    });
  });
  const qs = new Set(anorm(q).split(/\s+/).map(astem));
  RT_TOKENS.forEach((tk) => {
    const k = anorm(tk).trim();
    if (k.length > 3 && (n.includes(" " + k + " ") || (!k.includes(" ") && qs.has(astem(k))))) hits.push({ kind: "token", name: tk });
  });
  return hits;
}

/** Ranks every answer for a question. qt are the question's tokens after typo correction. */
export function match(q: string): { qt: string[]; res: { it: Intent; s: number }[] } {
  const all = intents();
  let qt = [...new Set(atoks(q))];
  qt = qt.map((t) => {
    if (IDF[t] || t.length < 4) return t;
    let best: string | null = null;
    let bd = 9;
    VOCAB.forEach((v) => {
      const d = lev(t, v);
      if (d < bd) {
        bd = d;
        best = v;
      }
    });
    return best && bd <= (t.length >= 7 ? 2 : 1) ? best : t;
  });
  const res = all
    .map((it) => {
      let s = 0;
      let m = 0;
      qt.forEach((t) => {
        const w = it.st.get(t);
        if (w) {
          s += IDF[t] * w;
          m++;
        }
      });
      return { it, s: m ? s * (0.6 + (0.4 * m) / qt.length) : 0 };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  return { qt, res };
}
