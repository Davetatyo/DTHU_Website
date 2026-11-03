"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { cubeAngles, cubeTransform, FACE_PLACEMENT, faceTransform } from "../lib/dice-cube";
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
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function Die({ value, spin, hop, held, onClick, disabled }: { value: number; spin: number; hop: number; held: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" className={`kz-die${held ? " held" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={held} aria-label={`${value}${held ? ", megtartva" : ""}`}>
      {/* Same element every roll (a new one wouldn't animate); the hop restarts by switching
          between two identical animations. */}
      <span className="kz-hop" style={{ animationName: hop === 0 ? "none" : hop % 2 ? "kz-hop-a" : "kz-hop-b" }}>
        <span className="kz-cube" style={{ transform: cubeTransform(cubeAngles(value, spin)) }}>
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <span key={f} className="kz-face" style={{ transform: `${faceTransform(FACE_PLACEMENT[f])} translateZ(var(--half))` }}>
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

/** A flat die face for the how-to cards. */
function MiniDie({ value, held }: { value: number; held?: boolean }) {
  return (
    <span className={`kz-mini${held ? " held" : ""}`} aria-hidden>
      {Array.from({ length: 9 }, (_, k) => (
        <i key={k} className={PIPS[value].includes(k + 1) ? "on" : ""} />
      ))}
    </span>
  );
}

const HOW_TO: { title: string; text: string; show: React.ReactNode }[] = [
  {
    title: "Dobj, és tartsd meg a jókat",
    text: "Körönként legfeljebb 3-szor dobhatsz az 5 kockával. Dobás után koppints azokra, amiket megtartasz: aranyszínűek lesznek, és a következő dobásnál a helyükön maradnak.",
    show: (
      <div className="kz-how-dice">
        <MiniDie value={5} held />
        <MiniDie value={5} held />
        <MiniDie value={2} />
        <MiniDie value={5} held />
        <MiniDie value={1} />
      </div>
    ),
  },
  {
    title: "Írd be egy mezőbe",
    text: "Bármelyik dobás után választhatsz egy mezőt: a kártyán látod, mennyit érne. Minden mező csak egyszer tölthető ki; ha semmi sem jött ki, egy mezőbe 0-t is írhatsz.",
    show: (
      <ul className="kz-how-list">
        <li><span>Full</span><b>25</b></li>
        <li><span>Kis sor</span><b>30</b></li>
        <li><span>Nagy sor</span><b>40</b></li>
        <li><span>Ultimate</span><b>50</b></li>
      </ul>
    ),
  },
  {
    title: "Győzd le a Barbárt",
    text: "Utánad a Barbár dob (közben neked szurkol…). Ha minden mező betelt, a több pont nyer. A teljes játékban a felső rész 63 pontja +35 bónuszt ér.",
    show: (
      <div className="kz-how-score">
        <span><small>Te</small><b>187</b></span>
        <span><small>Barbár</small><b>164</b></span>
      </div>
    ),
  },
];

/** "Hogyan játssz?": three cards to click through. */
function HowToPlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const card = HOW_TO[step];
  const last = step === HOW_TO.length - 1;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="kz-how" role="dialog" aria-modal="true" aria-label="Hogyan játssz?" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kz-how-card" key={step}>
        <button type="button" className="kz-how-x" onClick={onClose} aria-label="Bezárás">
          ×
        </button>
        <span className="kz-how-step">
          {step + 1} / {HOW_TO.length}
        </span>
        <h2>{card.title}</h2>
        {card.show}
        <p>{card.text}</p>
        <div className="kz-how-nav">
          <button type="button" className="kz-how-back" onClick={() => setStep(step - 1)} disabled={step === 0}>
            ‹ Vissza
          </button>
          <span className="kz-how-dots" aria-hidden>
            {HOW_TO.map((_, i) => (
              <i key={i} className={i === step ? "on" : ""} />
            ))}
          </span>
          <button type="button" className="kz-how-next" onClick={() => (last ? onClose() : setStep(step + 1))}>
            {last ? "Értem!" : "Tovább ›"}
          </button>
        </div>
      </div>
    </div>
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
  const [hops, setHops] = useState([0, 0, 0, 0, 0]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolling, setRolling] = useState(false);
  const [remark, setRemark] = useState("");
  const [howTo, setHowTo] = useState(false);
  const closeHowTo = useCallback(() => setHowTo(false), []);
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
    setHops((h) => h.map((v, i) => (keep[i] ? v : v + 1)));
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
            <button type="button" className="kz-howto-link" onClick={() => setHowTo(true)}>
              Hogyan játssz?
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
          {/* Scoreboard (owner's choice "A"): outside the board, big, the leader in gold. */}
          <div className="kz-score" aria-live="polite">
            <div className={`kz-side${myTotal > hisTotal ? " ahead" : ""}${turn === "you" ? " turn" : ""}`}>
              <small>
                Te<span className="kz-turnword">{turn === "you" ? " · dobsz" : ""}</span>
              </small>
              <b key={myTotal}>{myTotal}</b>
            </div>
            <div className="kz-mid">
              <span>
                {round}. kör / {boxes.length}
                <button type="button" className="kz-help" onClick={() => setHowTo(true)} aria-label="Hogyan játssz?">
                  ?
                </button>
              </span>
              <b>{myTotal === hisTotal ? "Fej fej mellett" : myTotal > hisTotal ? `Te vezetsz +${myTotal - hisTotal}` : `A Barbár vezet +${hisTotal - myTotal}`}</b>
            </div>
            <div className={`kz-side${hisTotal > myTotal ? " ahead" : ""}${turn === "him" ? " turn" : ""}`}>
              <small>
                Barbár<span className="kz-turnword">{turn === "him" ? " · dob" : ""}</span>
              </small>
              <b key={hisTotal}>{hisTotal}</b>
            </div>
          </div>
          <div className="kz-board">
            <div className={`kz-tray${turn === "him" ? " his" : ""}`}>
              {dice.map((v, i) => (
                <Die key={i} value={v} spin={spin[i]} hop={hops[i]} held={held[i]} onClick={() => toggle(i)} disabled={!yourTurn || !rolled || rollsLeft === 0} />
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

      {howTo && <HowToPlay onClose={closeHowTo} />}

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
