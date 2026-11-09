"use client";
/* eslint-disable @next/next/no-img-element -- small static game pictures from /public, sized by CSS */

import { useEffect, useRef, useState } from "react";
import { card, cardImage, unplayableReason, type CardPlay } from "../lib/cards";
import { applyMove, availableAbilities, resolveAttack, statusList, type AttackResult, type Fighter, type Move, type PuzzleState } from "../lib/engine";
import { HEROES, heroKit, type StatusId } from "../lib/heroes";
import { GOAL_HU, puzzleById } from "../lib/puzzles";
import { solve, type Solution } from "../lib/solver";
import { describeLine, describeMove, percent } from "../lib/text";

type Pending = { card: string; die?: number; value?: number; die2?: number };
type Played = { state: PuzzleState; move: Move; text: string };

const FACES = [1, 2, 3, 4, 5, 6];

/** Which die the pending card waits for, if any. */
function needsDie(p: Pending, kind: CardPlay["k"]): "first" | "second" | null {
  if (kind === "six" || kind === "wild" || kind === "tip") return p.die === undefined ? "first" : null;
  if (kind === "copy") return p.die === undefined ? "first" : "second";
  if (kind === "wild2") {
    if (p.die === undefined) return "first";
    if (p.value !== undefined && p.die2 === undefined) return "second";
  }
  return null;
}

function Die({ hero, value, onClick, picked, changed, disabled }: { hero: string; value: number; onClick?: () => void; picked?: boolean; changed?: boolean; disabled?: boolean }) {
  const cls = `tf-die${onClick && !disabled ? " pick" : ""}${picked ? " picked" : ""}${changed ? " changed" : ""}`;
  const img = <img src={`/jatekok/feladvany/dice/${hero}-${value}.webp`} alt={`${value}`} draggable={false} />;
  return onClick && !disabled ? (
    <button type="button" className={cls} onClick={onClick} aria-label={`${value}-es kocka`}>
      {img}
    </button>
  ) : (
    <span className={cls}>{img}</span>
  );
}

function HeroStrip({ f, me, onBoard, onZoom }: { f: Fighter; me?: boolean; onBoard: () => void; onZoom: (src: string) => void }) {
  const h = HEROES[f.hero];
  const kit = heroKit(f.hero, f.upgrades);
  return (
    <div className={`tf-hero${me ? " me" : ""}`}>
      <img className="tf-portrait" src={h.portrait} alt="" />
      <div className="tf-hero-main">
        <div className="tf-hero-name">
          {h.name}
          {me && <span className="tf-you">te</span>}
        </div>
        <div className="tf-stats">
          <span className="tf-hp" title="Életerő">
            ♥ {f.hp}
          </span>
          <span className="tf-cp" title="Harci pont (CP)">
            {f.cp} CP
          </span>
          {statusList(f).map((s) => (
            <span key={s.id} className={`tf-status st-${s.id}`} title={`${s.name}: ${s.text}`}>
              {s.name}
              {s.n > 1 && ` ×${s.n}`}
            </span>
          ))}
        </div>
        {!me && <div className="tf-def">Védekezés: {kit.defence.name} ({kit.defence.does})</div>}
      </div>
      <div className="tf-hero-side">
        {f.upgrades.map((u) => (
          <button key={u} type="button" className="tf-up" onClick={() => onZoom(cardImage(u))} title={card(u).name}>
            <img src={cardImage(u)} alt={card(u).name} />
          </button>
        ))}
        <button type="button" className="tf-board-btn" onClick={onBoard}>
          Hőstábla
        </button>
      </div>
    </div>
  );
}

export function PuzzleGame({ puzzleId }: { puzzleId: string }) {
  const puzzle = puzzleById(puzzleId)!;
  const start = puzzle.state;
  const [played, setPlayed] = useState<Played[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ability: string; res: AttackResult; best: Solution["best"] } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const solution = useRef<Solution | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const state = played.at(-1)?.state ?? start;
  const me = state.attacker;
  const hero = me.hero;
  const done = !!result;
  const pendingCard = pending ? card(pending.card) : null;
  const kind = pendingCard?.play?.k;
  const want = pending && kind ? needsDie(pending, kind) : null;
  const available = new Set(availableAbilities(state).map((a) => a.id));
  const abilities = heroKit(hero, me.upgrades).abilities;

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  function play(m: Move) {
    const next = applyMove(state, m);
    if (typeof next === "string") {
      setError(next);
      return;
    }
    setPlayed([...played, { state: next, move: m, text: describeMove(state, m) }]);
    setPending(null);
    setError(null);
  }

  function chooseCard(slug: string) {
    if (done) return;
    setError(null);
    if (pending?.card === slug) {
      setPending(null);
      return;
    }
    setPending({ card: slug });
  }

  function pickDie(i: number) {
    if (!pending || !kind) return;
    if (want === "first") {
      if (kind === "six") return play({ k: "six", card: pending.card, die: i });
      setPending({ ...pending, die: i });
    } else if (want === "second") {
      if (i === pending.die) return setError("Válassz egy másik kockát.");
      if (kind === "copy") return play({ k: "copy", card: pending.card, die: pending.die!, from: i });
      setPending({ ...pending, die2: i });
    }
  }

  function pickValue(v: number) {
    if (!pending || !kind) return;
    if (kind === "wild") return play({ k: "wild", card: pending.card, die: pending.die!, value: v });
    if (kind === "wild2") {
      if (pending.die2 === undefined) return setPending({ ...pending, value: v });
      return play({ k: "wild2", card: pending.card, die: pending.die!, value: pending.value!, die2: pending.die2, value2: v });
    }
  }

  function attack(abilityId: string) {
    solution.current ??= solve(start);
    setPending(null);
    setResult({ ability: abilityId, res: resolveAttack(state, abilityId), best: solution.current.best });
  }

  function reset() {
    setPlayed([]);
    setPending(null);
    setError(null);
    setResult(null);
    setShowSolution(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const solved = result && result.res.win >= result.best.result.win - 1e-9;
  const statusTargets: { side: "attacker" | "defender"; status: StatusId; label: string }[] = (["attacker", "defender"] as const).flatMap((side) =>
    statusList(state[side]).map((s) => ({
      side,
      status: s.id,
      label: `${s.name} – ${side === "attacker" ? "rólad" : `a ${HEROES[state.defender.hero].name}ről`}`,
    })),
  );

  let prompt: string | null = null;
  if (pending && pendingCard) {
    const why = unplayableReason(pendingCard);
    if (why) prompt = why;
    else if (pendingCard.cost > me.cp) prompt = `Nincs elég CP-d: ${pendingCard.cost} kell, ${me.cp} van.`;
    else if (kind === "six") prompt = "Melyik kockád legyen 6-os?";
    else if (kind === "wild") prompt = pending.die === undefined ? "Melyik kockát változtatod meg?" : "Mi legyen az új értéke?";
    else if (kind === "wild2")
      prompt =
        pending.die === undefined
          ? "Válaszd ki az első kockát."
          : pending.value === undefined
            ? "Mi legyen az első kocka új értéke?"
            : pending.die2 === undefined
              ? "Válaszd ki a második kockát."
              : "Mi legyen a második kocka új értéke?";
    else if (kind === "tip") prompt = pending.die === undefined ? "Melyik kockát pöccinted?" : "Növeled vagy csökkented?";
    else if (kind === "copy") prompt = pending.die === undefined ? "Melyik kockádat változtatod meg?" : "Melyik kockád értékét kapja meg?";
    else if (kind === "cp") prompt = "+2 CP-t kapsz.";
    else if (kind === "unstatus") prompt = statusTargets.length ? "Melyik állapotjelzőt veszed le?" : "Egyik játékoson sincs állapotjelző.";
  }
  const canAfford = !!pendingCard && !unplayableReason(pendingCard) && pendingCard.cost <= me.cp;

  return (
    <div className="tf">
      <div className="card tf-brief">
        <div className="tf-brief-top">
          <span className="chip info">{GOAL_HU[puzzle.goal]}</span>
          <span className="muted text-sm">{puzzle.id}. feladvány</span>
        </div>
        <h2>{puzzle.title}</h2>
        <p>{puzzle.brief}</p>
        <details className="tf-rules">
          <summary>Szabályok ebben a feladványban</summary>
          <ul>
            <li>A kockáid nem változnak, csak lapokkal (nincs több dobásod).</li>
            <li>Minden dobást, ami ezután jön (Vak, a védekezés, az Elkerülés, a képességek dobásai), a játék minden lehetséges kimenetellel kiszámol.</li>
            <li>Az ellenfél nem játszik ki lapot, és csak akkor költ Elkerülést, ha a sebzés halálos lenne.</li>
            <li>Csak ez a támadás számít: a Kábítás miatti extra támadási fázis nem.</li>
            <li>Az eredeti Season 1 hősök lapjai és táblái szerint.</li>
          </ul>
        </details>
      </div>

      <div className="tf-table">
        <HeroStrip f={state.defender} onBoard={() => setZoom(HEROES[state.defender.hero].board)} onZoom={setZoom} />

        <div className="tf-tray">
          <div className="tf-label">A dobásod</div>
          <div className="tf-dice">
            {state.dice.map((v, i) => (
              <Die
                key={i}
                hero={hero}
                value={v}
                onClick={want ? () => pickDie(i) : undefined}
                picked={pending?.die === i || pending?.die2 === i}
                changed={v !== start.dice[i]}
                disabled={done}
              />
            ))}
          </div>
          {pending && pendingCard && (
            <div className="tf-action">
              <img className="tf-action-card" src={cardImage(pendingCard.slug)} alt={pendingCard.name} onClick={() => setZoom(cardImage(pendingCard.slug))} />
              <div className="tf-action-body">
                <div className="tf-action-name">
                  {pendingCard.name} <span className="muted">({pendingCard.cost} CP)</span>
                </div>
                {prompt && <div className="tf-prompt">{prompt}</div>}
                {canAfford && kind === "wild" && pending.die !== undefined && (
                  <div className="tf-values">
                    {FACES.map((v) => (
                      <Die key={v} hero={hero} value={v} onClick={() => pickValue(v)} />
                    ))}
                  </div>
                )}
                {canAfford && kind === "wild2" && pending.die !== undefined && (pending.value === undefined || pending.die2 !== undefined) && (
                  <div className="tf-values">
                    {FACES.map((v) => (
                      <Die key={v} hero={hero} value={v} onClick={() => pickValue(v)} />
                    ))}
                  </div>
                )}
                {canAfford && kind === "tip" && pending.die !== undefined && (
                  <div className="tf-row">
                    <button type="button" className="btn btn-sm" disabled={state.dice[pending.die] === 1} onClick={() => play({ k: "tip", card: pending.card, die: pending.die!, delta: -1 })}>
                      −1
                    </button>
                    <button type="button" className="btn btn-sm" disabled={state.dice[pending.die] === 6} onClick={() => play({ k: "tip", card: pending.card, die: pending.die!, delta: 1 })}>
                      +1
                    </button>
                  </div>
                )}
                {canAfford && kind === "cp" && (
                  <button type="button" className="btn btn-sm" onClick={() => play({ k: "cp", card: pending.card })}>
                    Kijátszom
                  </button>
                )}
                {canAfford && kind === "unstatus" && (
                  <div className="tf-row">
                    {statusTargets.map((t) => (
                      <button key={t.side + t.status} type="button" className="btn btn-sm" onClick={() => play({ k: "unstatus", card: pending.card, side: t.side, status: t.status })}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                {error && <div className="tf-error">{error}</div>}
                <button type="button" className="tf-cancel" onClick={() => setPending(null)}>
                  Mégse
                </button>
              </div>
            </div>
          )}
        </div>

        <HeroStrip f={me} me onBoard={() => setZoom(HEROES[hero].board)} onZoom={setZoom} />

        <div>
          <div className="tf-label">A kezed{!done && " – koppints egy lapra"}</div>
          <div className="tf-hand">
            {state.hand.map((slug, i) => {
              const c = card(slug);
              const off = !!unplayableReason(c) || c.cost > me.cp;
              return (
                <button
                  key={`${slug}-${i}`}
                  type="button"
                  className={`tf-card${pending?.card === slug ? " sel" : ""}${off ? " off" : ""}`}
                  onClick={() => chooseCard(slug)}
                  disabled={done}
                  title={c.name}
                >
                  <img src={cardImage(slug)} alt={c.name} draggable={false} />
                </button>
              );
            })}
            {state.hand.length === 0 && <span className="muted text-sm">Nincs több lap a kezedben.</span>}
          </div>
        </div>

        {played.length > 0 && (
          <div className="tf-log">
            <div className="tf-label">Kijátszott lapok</div>
            <ol>
              {played.map((p, i) => (
                <li key={i}>{p.text}</li>
              ))}
            </ol>
            {!done && (
              <div className="tf-row">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPlayed(played.slice(0, -1))}>
                  Visszavonás
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={reset}>
                  Újrakezdés
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="tf-label">Képességeid – válassz egyet a támadáshoz</div>
          <div className="tf-abilities">
            {abilities.map((a) => {
              const on = available.has(a.id);
              return (
                <div key={a.id} className={`tf-ab${on ? " on" : ""}${result?.ability === a.id ? " chosen" : ""}`}>
                  <div className="tf-ab-text">
                    <div className="tf-ab-name">
                      {a.name} <span className="tf-ab-en">{a.nameEn}</span>
                      {a.ultimate && <span className="tf-ult">Ultimate</span>}
                      {a.card && <span className="tf-upg">fejlesztve</span>}
                    </div>
                    <div className="tf-ab-req">
                      <b>{a.needs}</b> · {a.does}
                    </div>
                  </div>
                  {on && !done && (
                    <button type="button" className="btn btn-sm" onClick={() => attack(a.id)}>
                      Támadás
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {result && (
        <div ref={resultRef} className={`card tf-result ${solved ? "ok" : "miss"}`}>
          <div className="tf-result-head">
            <span className="tf-result-title">{solved ? "Megoldva!" : "Van ennél biztosabb út"}</span>
            <span className="tf-odds">Győzelmi esély: {percent(result.res.win)}</span>
          </div>
          {result.res.tie > 0 && <p className="muted">Döntetlen esélye: {percent(result.res.tie)}</p>}
          <ul className="tf-notes">
            {result.res.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {solved && <p>{puzzle.explanation}</p>}
          {!solved && showSolution && (
            <div className="tf-solution">
              <div className="tf-label">A legjobb út ({percent(result.best.result.win)})</div>
              <ol>
                {describeLine(start, result.best.moves, result.best.ability).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
              <p>{puzzle.explanation}</p>
            </div>
          )}
          <div className="tf-row">
            <button type="button" className="btn" onClick={reset}>
              {solved ? "Még egyszer" : "Újrapróbálom"}
            </button>
            {!solved && !showSolution && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowSolution(true)}>
                Megoldás
              </button>
            )}
          </div>
        </div>
      )}

      {zoom && (
        <div className="tf-zoom" role="dialog" aria-modal onClick={() => setZoom(null)}>
          <img src={zoom} alt="" />
          <button type="button" className="tf-zoom-x" aria-label="Bezárás" onClick={() => setZoom(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
