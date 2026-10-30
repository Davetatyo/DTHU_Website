// What the Alchemist answers (from reference/artifact): picks the best answer, asks back when
// two answers are equally likely, and suggests questions when it doesn't understand.

import { anorm, entities, intents, match, type Intent } from "./matcher";

export const OPENERS = ["Ha-haa!", "Pompás kérdés!", "Kísérleteim szerint…", "Hihi, ezt tudom!", "A lombikjaim szerint…", "Bugyog a válasz!"];
const UNKNOWN = [
  "Hmm… ez a főzet nem sikerült. Nem értem pontosan a kérdést.",
  "Puff! Erre nincs receptem. Fogalmazd meg másképp!",
  "Ezt még nem kotyvasztottam ki. Próbáld rövidebben!",
];
export const SUGGESTIONS = [
  "Mennyi a kézlimit?",
  "Hogyan állíthatom meg az Ultimate-et?",
  "Mennyi CP-vel kezdek?",
  "Mi a tiszta sebzés?",
  "Hogyan szerzek jegyet?",
  "Hogyan egyeztetek időpontot?",
];
export const GREETING =
  "Ha-haa! Az <b>Alkimista</b> vagyok, a szabályok főzetmestere. Kérdezz bármit a Dice Throne szabályairól, a versenyről vagy a jegyekről!";

/** A bot message. html is our own trusted content (answers from the knowledge base). */
export type BotReply = {
  html: string;
  link?: [string, string];
  choices?: { id: string; title: string }[];
  suggestions?: string[];
  /** The question to offer sending to the admins. */
  unanswered?: string;
};

type Rand = () => number;
const pick = <T,>(a: T[], rand: Rand) => a[Math.floor(rand() * a.length)];

export function answer(it: Intent, rand: Rand = Math.random): BotReply {
  return { html: `${it.id.startsWith("s-") ? "" : pick(OPENERS, rand) + " "}${it.a}`, link: it.link };
}

export function answerById(id: string, rand: Rand = Math.random): BotReply | null {
  const it = intents().find((x) => x.id === id);
  return it ? answer(it, rand) : null;
}

export function reply(q: string, rand: Rand = Math.random): BotReply {
  const { qt, res } = match(q);
  const [top, sec] = res;
  if (/^\s*(ki|mi|kicsoda) (vagy|vagytok)\b/.test(anorm(q))) return answerById("s-ki", rand)!;
  if (!qt.length) return { html: "Csak bugyogás jött ki… írj egy kérdést a szabályokról!" };
  if (top && top.s >= 2.2) {
    if (sec && sec.s >= top.s * 0.85 && sec.it.a !== top.it.a && !top.it.id.startsWith("s-")) {
      return { html: "Hmm, kettő is bugyog a fejemben. Melyikre gondolsz?", choices: [top, sec].map((r) => ({ id: r.it.id, title: r.it.title })) };
    }
    return answer(top.it, rand);
  }
  const ents = entities(q);
  const hero = ents.find((e) => e.kind === "hero");
  const tok = ents.find((e) => e.kind === "token");
  if (hero) {
    return {
      html: `${pick(OPENERS, rand)} A(z) <b>${hero.name}</b> részletes hőslapja (képességek, kártyák) még készül a Szabálytárban. Addig általános szabályokban segítek!`,
      link: ["/szabalytar?tab=hosok", "Hősök listája"],
    };
  }
  if (tok) {
    return {
      html: `${pick(OPENERS, rand)} A(z) <b>${tok.name}</b> jelző pontos leírása még készül. Az általános jelzőszabály: az elkölthető jelzőt bármikor elköltheted, a tartós addig marad, amíg el nem távolítják.`,
      link: ["/szabalytar/allapotjelzok", "Állapotjelzők"],
    };
  }
  if (top && top.s >= 1.2) {
    return { html: "Nem vagyok benne biztos… erre gondoltál?", choices: res.slice(0, 3).map((r) => ({ id: r.it.id, title: r.it.title })) };
  }
  return { html: pick(UNKNOWN, rand), suggestions: SUGGESTIONS.slice(0, 3), unanswered: q };
}
