"use client";

import { useEffect, useRef, useState } from "react";
import {
  bonus,
  BONUS_AT,
  chooseBox,
  chooseHolds,
  DISTRACTED,
  highlight,
  HINTS,
  LABELS,
  openBoxes,
  rollDie,
  score,
  total,
  upperSum,
  VARIANTS,
  type Card,
  type Category,
  type Variant,
} from "../lib/dice";
import { buzz, useReducedMotion, useStage, useTyped } from "./stage";
import "../kockazat.css";

const INTRO = "Üdvözlégy harcos! Látom egy kis izgalomra vágysz! Készülj a harcra!";
const ASK_LENGTH = "Hűha… TE vagy az?! Mindig is a rajongód voltam! Mennyi időd van, harcos?";
const CHEER: Record<string, string> = {
  ultimate: "ULTIMATE!!! Ezt bekeretezem a barlangom falára!",
  large: "NAGY SOR! Libabőrös lettem!",
  small: "Kis sor! Ezt elmesélem a bátyámnak!",
  full: "FULL! Micsoda kezek!",
  "four-kind": "Négy egyforma! Kőkemény!",
};
const AFTER_ROLL = ["Szép dobás!", "Csak így tovább!", "Tartsd meg a jókat!", "Bízom benned!", "Hajrá, hajrá!"];
const MY_TURN = ["Ja, én jövök? Mindegy… láttad az előbbi dobásodat?!", "Most én… de csak mert muszáj.", "Na jó, dobok egyet. De a tiéd szebb lesz!"];
const MY_SCORE = ["Ezt ide írom. Nem baj, ugye?", "Hoppá, ez nem rossz… bocsánat!", "Na, a tiéd jobb volt."];
const ROLL_MS = 950;

/** Which pip spots (1–9, row by row) a face shows. */
const PIPS: Record<number, number[]> = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
/** Each face's place on the cube, and the turn that brings it to the front. */
const FACE_AT: Record<number, string> = {
  1: "rotateY(0deg)",
  6: "rotateY(180deg)",
  2: "rotateY(90deg)",
  5: "rotateY(-90deg)",
  3: "rotateX(90deg)",
  4: "rotateX(-90deg)",
};
const SHOW: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function Die({ value, spin, held, onClick, disabled }: { value: number; spin: number; held: boolean; onClick: () => void; disabled: boolean }) {
  const [x, y] = SHOW[value];
  return (
    <button type="button" className={`kz-die${held ? " held" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={held} aria-label={`${value}${held ? ", megtartva" : ""}`}>
      <span className="kz-hop" key={spin}>
        <span className="kz-cube" style={{ transform: `rotateX(${x + spin * 360}deg) rotateY(${y + spin * 360}deg) rotateZ(${spin * 90}deg)` }}>
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <span key={f} className="kz-face" style={{ transform: `${FACE_AT[f]} translateZ(var(--half))` }}>
              {Array.from({ length: 9 }, (_, k) => (
                <i key={k} className={PIPS[f].includes(k + 1) ? "on" : ""} />
              ))}
            </span>
          ))}
        </span>
      </span>
      <span className="kz-tag">{held ? "megtartva" : ""}</span>
    </button>
  );
}

type Phase = "intro" | "length" | "play" | "end";

/** Kockázat: dice poker against the Barbarian, who mostly cheers for you. */
export function DiceGame() {
  const reduced = useReducedMotion();
  const { stage, center, style } = useStage(reduced);
  const [phase, setPhase] = useState<Phase>("intro");
  const [fan, setFan] = useState(false);
  const [variant, setVariant] = useState<Variant>("short");
  const [mine, setMine] = useState<Card>({});
  const [his, setHis] = useState<Card>({});
  const [turn, setTurn] = useState<"you" | "him">("you");
  const [dice, setDice] = useState([1, 2, 3, 4, 5]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [spin, setSpin] = useState([0, 0, 0, 0, 0]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolling, setRolling] = useState(false);
  const [remark, setRemark] = useState("");
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const intro = useTyped(phase === "intro" ? INTRO : "", 34, reduced);
  const askLength = useTyped(phase === "length" ? ASK_LENGTH : "", 26, reduced);
  const rolled = rollsLeft < 3;
  const yourTurn = phase === "play" && turn === "you" && !rolling;

  /** Rolls the dice that aren't kept; resolves with the new dice after the tumble. */
  async function roll(current: number[], keep: boolean[]): Promise<number[]> {
    const next = current.map((v, i) => (keep[i] ? v : rollDie()));
    setRolling(true);
    setDice(next);
    setSpin((s) => s.map((v, i) => (keep[i] ? v : v + 2 + Math.floor(Math.random() * 2))));
    buzz([10, 60, 10]);
    await wait(reduced ? 0 : ROLL_MS);
    setRolling(false);
    return next;
  }

  function start() {
    setFan(false);
    setPhase("length");
    setRemark("");
    center(true);
    // The stern warrior turns into a fan: the pictures cross-fade once the speech is read.
    window.setTimeout(() => setFan(true), reduced ? 0 : 250);
  }

  function choose(v: Variant) {
    setVariant(v);
    setMine({});
    setHis({});
    setTurn("you");
    setHeld([false, false, false, false, false]);
    setRollsLeft(3);
    setPhase("play");
    setRemark("Hajrá! Te kezdesz, mutasd meg nekik!");
    center(true);
  }

  async function yourRoll() {
    if (!yourTurn || rollsLeft === 0) return;
    const keep = rolled ? held : [false, false, false, false, false];
    const next = await roll(dice, keep);
    setRollsLeft((r) => r - 1);
    const best = highlight(next);
    setRemark(best ? CHEER[best] : rollsLeft - 1 === 0 ? "Na, hova írod?" : pick(AFTER_ROLL));
    if (best) buzz([20, 40, 20, 40, 60]);
  }

  function toggle(i: number) {
    if (!yourTurn || !rolled || rollsLeft === 0) return;
    buzz(6);
    setHeld((h) => h.map((v, k) => (k === i ? !v : v)));
  }

  async function write(c: Category) {
    if (!yourTurn || !rolled || mine[c] !== undefined) return;
    const points = score(c, dice);
    const card = { ...mine, [c]: points };
    setMine(card);
    buzz(12);
    setRemark(points === 0 ? "Semmi baj, a legnagyobbak is áthúznak néha!" : points >= 30 ? `Ez az! ${points} pont!` : pick(AFTER_ROLL));
    await wait(reduced ? 0 : 900);
    if (!alive.current) return;
    await hisTurn(card);
  }

  /** The Barbarian's whole turn, animated step by step. */
  async function hisTurn(myCard: Card) {
    setTurn("him");
    setHeld([false, false, false, false, false]);
    setRollsLeft(3);
    setRemark(pick(MY_TURN));
    await wait(reduced ? 0 : 900);
    const open = openBoxes(his, variant);
    let d = await roll(dice, [false, false, false, false, false]);
    for (let left = 2; left > 0 && alive.current; left--) {
      const keep = chooseHolds(d, open, left, Math.random, 25, DISTRACTED);
      if (keep.every(Boolean)) break;
      setHeld(keep);
      await wait(reduced ? 0 : 650);
      d = await roll(d, keep);
    }
    if (!alive.current) return;
    const box = chooseBox(d, open);
    const points = score(box, d);
    const card = { ...his, [box]: points };
    setHis(card);
    setHeld([false, false, false, false, false]);
    setRemark(box === "ultimate" && points ? "Ultimate?! Bocsánat, ez véletlen volt!" : `${LABELS[box]}: ${points}. ${pick(MY_SCORE)}`);
    await wait(reduced ? 0 : 1300);
    if (!alive.current) return;
    if (openBoxes(myCard, variant).length === 0) {
      setPhase("end");
      center(true);
      return;
    }
    setTurn("you");
    setRollsLeft(3);
    setRemark("Te jössz! Hajrá!");
  }

  const myTotal = total(mine, variant);
  const hisTotal = total(his, variant);
  const boxes = VARIANTS[variant].categories;
  const round = Math.min(boxes.length, Object.keys(mine).length + (turn === "you" ? 1 : 0));

  return (
    <div ref={stage} className={`kz${fan ? " fan" : ""}${phase !== "intro" ? " started" : ""}`} data-phase={phase} style={style}>
      <div className="kz-bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, full-bleed art */}
        <img className="kz-warrior" src="/jatekok/barbar-harcos.jpg" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, full-bleed art */}
        <img className="kz-fanboy" src="/jatekok/barbar-rajongo.jpg" alt="" />
        <span className="kz-flash" />
      </div>
      {!reduced && (
        <div className="kz-embers" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 61) % 100}%`, animationDelay: `${(i * 0.41) % 6}s`, animationDuration: `${5 + (i % 4)}s` }} />
          ))}
        </div>
      )}

      {phase === "intro" && (
        <div className="kz-intro">
          <div className="kz-bubble" role="status">
            {intro.shown}
            <span className="kz-caret" aria-hidden>
              {intro.done ? "" : "▌"}
            </span>
          </div>
          <div className={`kz-start${intro.done ? " show" : ""}`}>
            <p className="kz-hint">Kockapóker a Barbár ellen: 5 kocka, körönként 3 dobás.</p>
            <button type="button" className="btn kz-go" onClick={start} disabled={!intro.done}>
              Harcra fel!
            </button>
          </div>
        </div>
      )}

      {phase === "length" && (
        <div className="kz-intro">
          <div className="kz-bubble" role="status">
            {askLength.shown}
          </div>
          <div className={`kz-choices${askLength.done ? " show" : ""}`}>
            {(["short", "full"] as Variant[]).map((v) => (
              <button key={v} type="button" className="kz-choice" onClick={() => choose(v)} disabled={!askLength.done}>
                <b>{VARIANTS[v].label}</b>
                <small>{VARIANTS[v].detail}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "play" && (
        <div className="kz-play">
          <div className="kz-say" key={remark} aria-live="polite">
            {remark}
          </div>
          <div className="kz-board">
            <div className="kz-status">
              <span>
                {round}. kör / {boxes.length}
              </span>
              <span className={turn === "you" ? "now" : ""}>Te {myTotal}</span>
              <span className={turn === "him" ? "now" : ""}>Barbár {hisTotal}</span>
            </div>
            <div className={`kz-tray${turn === "him" ? " his" : ""}`}>
              {dice.map((v, i) => (
                <Die key={i} value={v} spin={spin[i]} held={held[i]} onClick={() => toggle(i)} disabled={!yourTurn || !rolled || rollsLeft === 0} />
              ))}
            </div>
            <button type="button" className="kz-roll" onClick={yourRoll} disabled={!yourTurn || rollsLeft === 0}>
              {turn === "him" ? "A Barbár dob…" : rolling ? "Gurul…" : rollsLeft === 0 ? "Válassz egy mezőt!" : `Dobás (${rollsLeft} maradt)`}
            </button>
            {variant === "full" && (
              <p className="kz-upper">
                Felső rész: {upperSum(mine)} / {BONUS_AT} {bonus(mine, variant) ? "· +35 bónusz!" : ""}
              </p>
            )}
            <div className="kz-card">
              {boxes.map((c) => {
                const done = mine[c] !== undefined;
                const preview = !done && yourTurn && rolled ? score(c, dice) : null;
                return (
                  <button key={c} type="button" className={`kz-box${done ? " done" : ""}${preview !== null ? " can" : ""}${preview === 0 ? " zero" : ""}`} onClick={() => write(c)} disabled={done || preview === null}>
                    <span className="kz-name">
                      {LABELS[c]}
                      <small>{HINTS[c]}</small>
                    </span>
                    <span className="kz-pts">{done ? mine[c] : (preview ?? "")}</span>
                    <span className="kz-his" title="A Barbár pontja">
                      {his[c] ?? "–"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {phase === "end" && (
        <div className="kz-end">
          <div className="kz-bubble">
            {myTotal > hisTotal
              ? "GYŐZTÉL! Tudtam! Végig tudtam! Adsz egy autogramot?"
              : myTotal < hisTotal
                ? "Én… nyertem? Bocsánat, nem akartam! Visszavágó?"
                : "Döntetlen! Ketten vagyunk a bajnokok!"}
          </div>
          <div className="kz-final">
            <div className={myTotal >= hisTotal ? "win" : ""}>
              <small>Te</small>
              <b>{myTotal}</b>
            </div>
            <div className={hisTotal > myTotal ? "win" : ""}>
              <small>Barbár</small>
              <b>{hisTotal}</b>
            </div>
          </div>
          <button type="button" className="btn kz-go" onClick={() => setPhase("length")}>
            Visszavágó
          </button>
        </div>
      )}
    </div>
  );
}
