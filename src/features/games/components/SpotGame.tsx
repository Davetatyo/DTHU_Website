"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addScore, hitSpot, maxScore, onFoundSpot, PICTURES, ROUND_SECONDS, title, type SpotPicture } from "../lib/spot";
import { buzz, useReducedMotion, useStage } from "./stage";
import "../szemfules.css";

type Phase = "pick" | "countdown" | "play" | "end";
type Mark = { id: number; x: number; y: number; side: 0 | 1; text: string; bad: boolean };

const bestKey = (id: string) => `dthu:szemfules:best:${id}`;
function readBest(id: string): number | null {
  try {
    const v = localStorage.getItem(bestKey(id));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function saveBest(id: string, score: number) {
  try {
    const old = readBest(id);
    if (old === null || score > old) localStorage.setItem(bestKey(id), String(score));
  } catch {}
}

/** One of the two pictures, with the rings of found differences and the tap marks. */
function Picture({
  picture,
  side,
  found,
  reveal,
  marks,
  shake,
  onTap,
}: {
  picture: SpotPicture;
  side: 0 | 1;
  found: ReadonlySet<number>;
  reveal: boolean;
  marks: Mark[];
  shake: boolean;
  onTap: (x: number, y: number, side: 0 | 1) => void;
}) {
  return (
    <div
      className={`sf-pic${shake ? " shake" : ""}`}
      style={{ aspectRatio: String(picture.ratio) }}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onTap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, side);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- game picture, sized by its box */}
      <img src={picture.images[side]} alt={side === 0 ? "Első kép" : "Második kép"} draggable={false} />
      <svg className="sf-rings" viewBox={`0 0 1000 ${1000 / picture.ratio}`} aria-hidden>
        {picture.spots.map((s, i) => {
          const isFound = found.has(i);
          if (!isFound && !reveal) return null;
          return (
            <circle
              key={i}
              className={isFound ? "found" : "missed"}
              cx={s.x * 1000}
              cy={(s.y * 1000) / picture.ratio}
              r={Math.max(s.r * 1000, 30)}
              pathLength={100}
            />
          );
        })}
      </svg>
      {marks
        .filter((m) => m.side === side)
        .map((m) => (
          <span key={m.id} className={`sf-mark${m.bad ? " bad" : ""}`} style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}>
            {m.bad && <i aria-hidden>✕</i>}
            <b>{m.text}</b>
          </span>
        ))}
    </div>
  );
}

/** Szemfüles: find the 10 differences in 60 seconds. */
export function SpotGame() {
  const reduced = useReducedMotion();
  const { stage, center, style } = useStage(reduced);
  const [phase, setPhase] = useState<Phase>("pick");
  const [picture, setPicture] = useState<SpotPicture>(PICTURES[0]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [count, setCount] = useState(3);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [shake, setShake] = useState<0 | 1 | null>(null);
  const [best, setBest] = useState<Record<string, number | null>>({});
  const [shown, setShown] = useState(0);
  const endAt = useRef(0);
  const markId = useRef(0);
  const lastMiss = useRef(0);
  const scoreRef = useRef(0);
  useEffect(() => void (scoreRef.current = score), [score]);

  useEffect(() => setBest(Object.fromEntries(PICTURES.map((p) => [p.id, readBest(p.id)]))), [phase]);

  const finish = useCallback(
    (finalScore: number) => {
      setPhase("end");
      saveBest(picture.id, finalScore);
      center(true);
    },
    [picture.id, center],
  );

  // 3-2-1, then the clock runs.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      endAt.current = Date.now() + ROUND_SECONDS * 1000;
      setPhase("play");
      return;
    }
    const t = window.setTimeout(() => setCount((c) => c - 1), reduced ? 300 : 750);
    return () => window.clearTimeout(t);
  }, [phase, count, reduced]);

  useEffect(() => {
    if (phase !== "play") return;
    const t = window.setInterval(() => {
      const s = Math.max(0, (endAt.current - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0) {
        window.clearInterval(t);
        finish(scoreRef.current);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [phase, finish]);

  // The final score counts up on the results screen.
  useEffect(() => {
    if (phase !== "end") return;
    if (reduced) return setShown(score);
    setShown(0);
    const t = window.setInterval(() => setShown((v) => (v >= score ? (window.clearInterval(t), v) : Math.min(score, v + 2))), 25);
    return () => window.clearInterval(t);
  }, [phase, score, reduced]);

  function start(p: SpotPicture) {
    setPicture(p);
    setFound(new Set());
    setScore(0);
    setMisses(0);
    setMarks([]);
    setLeft(ROUND_SECONDS);
    setCount(3);
    setPhase("countdown");
    center(true);
  }

  function addMark(m: Omit<Mark, "id">) {
    const id = ++markId.current;
    setMarks((all) => [...all, { ...m, id }]);
    window.setTimeout(() => setMarks((all) => all.filter((x) => x.id !== id)), 900);
  }

  function tap(x: number, y: number, side: 0 | 1) {
    if (phase !== "play") return;
    const hit = hitSpot(picture, found, x, y);
    if (hit !== null) {
      const next = new Set(found).add(hit);
      const sc = addScore(score, true);
      setFound(next);
      setScore(sc);
      buzz([12, 40, 12]);
      addMark({ x, y, side, text: "+10", bad: false });
      if (next.size === picture.spots.length) window.setTimeout(() => finish(sc), 700);
      return;
    }
    if (onFoundSpot(picture, found, x, y)) return;
    // A double tap shouldn't cost twice.
    if (Date.now() - lastMiss.current < 300) return;
    lastMiss.current = Date.now();
    setScore((s) => addScore(s, false));
    setMisses((m) => m + 1);
    buzz(40);
    addMark({ x, y, side, text: "−5", bad: true });
    setShake(side);
    window.setTimeout(() => setShake(null), 400);
  }

  const max = maxScore(picture);
  const result = title(score, max);
  const urgent = phase === "play" && left <= 10;

  return (
    <div ref={stage} className="sf" data-phase={phase} style={style}>
      {phase === "pick" && (
        <div className="sf-pick">
          <h2>Válassz egy képet!</h2>
          <p className="sf-sub">10 különbség, 60 másodperc. Találat: +10 pont, rossz kattintás: −5 pont.</p>
          <div className="sf-cards">
            {PICTURES.map((p) => (
              <button key={p.id} type="button" className="sf-card" onClick={() => start(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- picture preview */}
                <img src={p.images[0]} alt="" />
                <span>
                  <b>{p.name}</b>
                  <small>{best[p.id] != null ? `Legjobb: ${best[p.id]} pont` : `${p.spots.length} különbség`}</small>
                </span>
              </button>
            ))}
            <div className="sf-card soon" aria-hidden>
              <span>
                <b>Hamarosan</b>
                <small>Újabb képek érkeznek</small>
              </span>
            </div>
          </div>
        </div>
      )}

      {phase !== "pick" && (
        <>
          <div className="sf-bar">
            <span className="sf-name">{picture.name}</span>
            <span className="sf-found">
              {found.size} / {picture.spots.length}
            </span>
            <span className="sf-score" key={score}>
              {score} pont
            </span>
            <span className={`sf-time${urgent ? " urgent" : ""}`}>{Math.ceil(left)} mp</span>
          </div>
          <div className="sf-clock" aria-hidden>
            <span className={urgent ? "urgent" : ""} style={{ width: `${(left / ROUND_SECONDS) * 100}%` }} />
          </div>
          <div className={`sf-pics${phase === "countdown" ? " hidden" : ""}`}>
            {([0, 1] as const).map((side) => (
              <Picture key={side} picture={picture} side={side} found={found} reveal={phase === "end"} marks={marks} shake={shake === side} onTap={tap} />
            ))}
          </div>
          <p className="sf-tip">Tipp: fordítsd el a telefont, így nagyobbak a képek.</p>
        </>
      )}

      {phase === "countdown" && (
        <div className="sf-count" aria-live="assertive">
          <b key={count}>{count || "Rajt!"}</b>
        </div>
      )}

      {phase === "end" && (
        <div className="sf-end">
          <div className="sf-result">
            <span className="sf-stamp">{result.name}</span>
            <b className="sf-total">{shown} pont</b>
            <p>{result.text}</p>
            <p className="sf-sub">
              {found.size} / {picture.spots.length} különbség · {misses} rossz kattintás
              {found.size < picture.spots.length ? " · a kimaradtakat villogó kör jelöli" : ""}
            </p>
            <div className="sf-actions">
              <button type="button" className="btn" onClick={() => start(picture)}>
                Újra
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPhase("pick")}>
                Másik kép
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
