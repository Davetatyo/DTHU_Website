"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { answer, confidence, MAX_QUESTIONS, newGame, nextMove, wrongGuess, type GameState } from "../lib/tactician";
import type { GameHero, TacticianData } from "../lib/tactician-data";
import type { Trait } from "../lib/tactician-traits";
import "../tactician.css";

const INTRO = "Azt hiszed lehetnek titkaid előttem? Minden eshetőségre felkészültem! Készen állsz?";
const REMARKS = [
  "Értem.",
  "Ahogy terveztem.",
  "Ez a lépés várható volt.",
  "A kör szűkül…",
  "Érdekes.",
  "Minden információ fegyver.",
  "Folytassuk a hadműveletet.",
  "Pontosan erre számítottam.",
  "Hmm…",
];
const THINK_MS = 600;

type Phase =
  | { kind: "intro" }
  | { kind: "ask"; trait: Trait }
  | { kind: "guess"; hero: GameHero }
  | { kind: "won"; hero: GameHero }
  | { kind: "lost" }
  | { kind: "picked"; hero: GameHero };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduced;
}

/** Types `text` out letter by letter (instantly with reduced motion). */
function useTyped(text: string, speed: number, reduced: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) return setN(text.length);
    setN(0);
    const t = window.setInterval(() => setN((x) => (x >= text.length ? (window.clearInterval(t), x) : x + 1)), speed);
    return () => window.clearInterval(t);
  }, [text, speed, reduced]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
};

/** Taktikai Előny: the Hadvezér guesses the hero you thought of, from yes/no answers. */
export function TacticianGame({ data }: { data: TacticianData }) {
  const reduced = useReducedMotion();
  const heroById = useMemo(() => new Map(data.heroes.map((h) => [h.id, h])), [data.heroes]);
  const [state, setState] = useState<GameState>(() => newGame(data.heroes.map((h) => h.id)));
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [started, setStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [remark, setRemark] = useState("");
  const [rounds, setRounds] = useState(0);
  const timer = useRef<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  const intro = useTyped(phase.kind === "intro" ? INTRO : "", 34, reduced);
  const question = useTyped(phase.kind === "ask" ? phase.trait.q : "", 14, reduced);

  /** His next move from `s`, after a short "thinking" beat. */
  const advance = useCallback(
    (s: GameState, line: string, ms = THINK_MS) => {
      setThinking(true);
      setRemark(line);
      timer.current = window.setTimeout(
        () => {
          setThinking(false);
          const move = nextMove(s, data.traits);
          if (move.kind === "ask") setPhase({ kind: "ask", trait: move.trait });
          else if (move.kind === "guess") {
            setRemark("Megvan.");
            setPhase({ kind: "guess", hero: heroById.get(move.hero)! });
            buzz(20);
          } else setPhase({ kind: "lost" });
        },
        reduced ? 0 : ms,
      );
    },
    [data.traits, heroById, reduced],
  );

  function start() {
    const fresh = newGame(data.heroes.map((h) => h.id));
    setState(fresh);
    setStarted(true);
    setRounds((r) => r + 1);
    // Bring the whole stage (and the answer buttons) into view.
    stage.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
    // The first time, his portrait melts into the background before the first question.
    advance(fresh, "Akkor kezdjük.", rounds ? THINK_MS : 1300);
  }

  function reply(yes: boolean) {
    if (phase.kind !== "ask" || thinking) return;
    buzz(8);
    const s = answer(state, phase.trait, yes);
    setState(s);
    advance(s, pick(REMARKS));
  }

  function judge(right: boolean) {
    if (phase.kind !== "guess") return;
    if (right) {
      buzz([15, 50, 15, 50, 40]);
      setPhase({ kind: "won", hero: phase.hero });
      return;
    }
    const s = wrongGuess(state, phase.hero.id);
    setState(s);
    advance(s, "Egy rejtett tartalék… Folytassuk.");
  }

  const asked = state.asked.length;
  const sure = Math.round(confidence(state) * 100);

  return (
    <div ref={stage} className={`ta${started ? " started" : ""}${thinking ? " thinking" : ""}`} data-phase={phase.kind}>
      <div className="ta-bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, full-bleed art */}
        <img src="/jatekok/hadvezer-alak.jpg" alt="" />
        <span className="ta-glow" />
      </div>
      {!reduced && (
        <div className="ta-embers" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.37) % 6}s`, animationDuration: `${5 + (i % 5)}s` }} />
          ))}
        </div>
      )}

      {phase.kind === "intro" && (
        <div className="ta-intro">
          {/* eslint-disable-next-line @next/next/no-img-element -- the Hadvezér's portrait */}
          <img className="ta-portrait" src="/jatekok/hadvezer-portre.jpg" alt="A Hadvezér" />
          <div className="ta-bubble" role="status">
            <span>{intro.shown}</span>
            <span className="ta-caret" aria-hidden>
              {intro.done ? "" : "▌"}
            </span>
          </div>
          <div className={`ta-start${intro.done ? " show" : ""}`}>
            <p className="ta-hint">Gondolj egy Dice Throne hősre. Csak igennel vagy nemmel válaszolhatsz.</p>
            <button type="button" className="btn ta-go" onClick={start} disabled={!intro.done}>
              {rounds ? "Új hadjárat" : "Készen állok"}
            </button>
          </div>
        </div>
      )}

      {phase.kind !== "intro" && (
        <div className="ta-play">
          <div className="ta-remark" key={remark} aria-live="polite">
            {remark}
          </div>

          {phase.kind === "ask" && (
            <div className="ta-card">
              <div className="ta-meta">
                <span>
                  {asked + 1}. kérdés / {MAX_QUESTIONS}
                </span>
                <span>Bizonyosság {sure}%</span>
              </div>
              <div className="ta-sure" aria-hidden>
                <span style={{ width: `${sure}%` }} />
              </div>
              <h2 className="ta-q">{question.shown || " "}</h2>
              <div className="ta-answers">
                <button type="button" className="ta-yes" onClick={() => reply(true)} disabled={thinking}>
                  Igen
                </button>
                <button type="button" className="ta-no" onClick={() => reply(false)} disabled={thinking}>
                  Nem
                </button>
              </div>
            </div>
          )}

          {phase.kind === "guess" && (
            <div className="ta-card ta-reveal">
              <p className="ta-meta">Erre a hősre gondoltál?</p>
              <div className="ta-hero">
                {/* eslint-disable-next-line @next/next/no-img-element -- hero portrait from the Szabálytár */}
                <img src={phase.hero.portrait} alt="" />
                <h2>{phase.hero.name}</h2>
              </div>
              <div className="ta-answers">
                <button type="button" className="ta-yes" onClick={() => judge(true)}>
                  Igen, eltaláltad
                </button>
                <button type="button" className="ta-no" onClick={() => judge(false)}>
                  Nem
                </button>
              </div>
            </div>
          )}

          {phase.kind === "won" && (
            <div className="ta-card ta-end won">
              <div className="ta-hero">
                {/* eslint-disable-next-line @next/next/no-img-element -- hero portrait from the Szabálytár */}
                <img src={phase.hero.portrait} alt="" />
                <h2>{phase.hero.id === "tactician" ? "Magadra gondoltál… vagyis rám? Hízelgő. De kiszámítható." : "Taktikai előny: az enyém."}</h2>
              </div>
              <p className="ta-sub">
                {phase.hero.name} · {asked} kérdés{state.wrong.length ? `, ${state.wrong.length + 1}. tippre` : ", első tippre"}
              </p>
              <button type="button" className="btn ta-go" onClick={start}>
                Még egy hadjárat
              </button>
            </div>
          )}

          {phase.kind === "lost" && (
            <div className="ta-card ta-end">
              <h2 className="ta-q">Ez a hadjárat a tiéd. Kire gondoltál?</h2>
              <div className="ta-pick">
                {data.heroes.map((h) => (
                  <button key={h.id} type="button" onClick={() => setPhase({ kind: "picked", hero: h })}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- hero portrait from the Szabálytár */}
                    <img src={h.portrait} alt="" loading="lazy" />
                    <span>{h.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase.kind === "picked" && (
            <div className="ta-card ta-end">
              <div className="ta-hero">
                {/* eslint-disable-next-line @next/next/no-img-element -- hero portrait from the Szabálytár */}
                <img src={phase.hero.portrait} alt="" />
                <h2>{phase.hero.name}… Megjegyzem. Legközelebb felkészülök.</h2>
              </div>
              <button type="button" className="btn ta-go" onClick={start}>
                Visszavágó
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
