"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { HeroIcon } from "@/components/HeroIcon";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { adminEditGame, correctGame, reportGame, type FormState } from "@/features/match-reporting/actions/games";
import type { RelativeInput } from "@/features/match-reporting/lib/form";
import "../match-reporting.css";

type Opponent = { id: string; name: string };
type Fixture = { href: string; tournament: string };

type Props = {
  heroNames: readonly string[];
  myName: string;
  /** datetime-local bounds in the viewer's time zone. */
  maxWall: string;
  minWall: string;
  initial: RelativeInput;
} & (
  | { mode: "new"; opponents: Opponent[]; fixtures: Record<string, Fixture> }
  | { mode: "correct"; gameId: string; seen: string; opponentName: string }
  /** Admin edit: myName / opponentName are sides a / b, initial is from side a. */
  | { mode: "admin"; gameId: string; opponentName: string }
);

const ACTIONS = { new: reportGame, correct: correctGame, admin: adminEditGame } as const;
const SUBMIT = { new: "Játszma elküldése", correct: "Javítás elküldése", admin: "Módosítás mentése" } as const;

/**
 * The game result form, from the viewer's side. "new": casual / ranked, opponent, result.
 * "correct": the other player's version, prefilled, to send back corrected. The server checks
 * everything again (actions/games.ts). "admin": an admin sets the result of both sides, with a
 * required reason.
 */
export function GameForm(props: Props) {
  const [state, action] = useActionState<FormState, FormData>(ACTIONS[props.mode], null);
  const [v, setV] = useState<RelativeInput>(props.initial);
  const [opponentId, setOpponentId] = useState("");
  const [context, setContext] = useState<"casual" | "ranked">("casual");
  const [reason, setReason] = useState("");
  const set = (k: keyof RelativeInput, value: string) => setV((prev) => ({ ...prev, [k]: value }));

  const oppName = props.mode === "new" ? props.opponents.find((o) => o.id === opponentId)?.name ?? "Ellenfél" : props.opponentName;
  const fixture = props.mode === "new" && opponentId ? props.fixtures[opponentId] : undefined;

  // Entering both health values picks the winner (the one left standing; both on 0 = draw).
  function changeHp(k: "my_hp" | "opp_hp", value: string) {
    const next = { ...v, [k]: value };
    if (next.my_hp !== "" && next.opp_hp !== "") {
      const me = Number(next.my_hp);
      const opp = Number(next.opp_hp);
      if (me > 0 && opp === 0) next.outcome = "me";
      else if (opp > 0 && me === 0) next.outcome = "opp";
      else if (me === 0 && opp === 0) next.outcome = "draw";
    }
    setV(next);
  }

  return (
    // React resets a form after its action; every field is controlled, and the key rebuilds the
    // fields from that state after an error, so nothing typed is lost.
    <form key={state?.at ?? 0} action={action} className="gr-form">
      {props.mode !== "new" && <input type="hidden" name="game_id" value={props.gameId} />}
      {props.mode === "correct" && <input type="hidden" name="seen" value={props.seen} />}
      {state?.error && <p className="alert-error" role="alert">{state.error}</p>}

      {props.mode === "new" && (
        <section className="gr-sec">
          <div className="gr-two">
            <div>
              <span className="label">
                Játszma típusa
                <InfoTip text="Ranked: beszámít a későbbi ranglistába. Casual: csak a statisztikádban jelenik meg." />
              </span>
              <div className="gr-seg" role="radiogroup" aria-label="Játszma típusa">
                {(
                  [
                    ["casual", "Casual"],
                    ["ranked", "Ranked"],
                  ] as const
                ).map(([value, text]) => (
                  <label key={value}>
                    <input type="radio" name="context" value={value} className="sr-only" checked={context === value} onChange={() => setContext(value)} />
                    {text}
                  </label>
                ))}
              </div>
            </div>
            <label>
              <span className="label">Ellenfél</span>
              <select name="opponent_id" className="input" value={opponentId} onChange={(e) => setOpponentId(e.target.value)} required>
                <option value="">Válassz játékost…</option>
                {props.opponents.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {fixture && (
            <p className="alert-info text-sm">
              Nektek van még egy lejátszatlan meccsetek a(z) {fixture.tournament} bajnokságban. Ha azt játszottátok, ott rögzítsd az
              eredményt:{" "}
              <Link href={fixture.href} className="link">
                bajnoki meccs megnyitása
              </Link>
              .
            </p>
          )}
        </section>
      )}

      <section className="gr-sec">
        <h3>Hősök</h3>
        <div className="gr-two">
          <HeroPick label={props.myName} name="my_hero" value={v.my_hero} heroes={props.heroNames} onChange={(h) => set("my_hero", h)} />
          <HeroPick label={oppName} name="opp_hero" value={v.opp_hero} heroes={props.heroNames} onChange={(h) => set("opp_hero", h)} />
        </div>
      </section>

      <section className="gr-sec">
        <div>
          <h3>Életerő</h3>
          <p className="muted text-xs">A játék végén maradt életerő. Kitöltéskor a győztest is beállítja.</p>
        </div>
        <div className="gr-two">
          {(
            [
              ["my_hp", props.myName],
              ["opp_hp", oppName],
            ] as const
          ).map(([k, label]) => (
            <label key={k}>
              <span className="label">{label}</span>
              <input type="number" name={k} min={0} max={99} inputMode="numeric" className="input" value={v[k]} onChange={(e) => changeHp(k, e.target.value)} required />
            </label>
          ))}
        </div>
      </section>

      <section className="gr-sec">
        <h3>Győztes</h3>
        <div className="gr-outcome" role="radiogroup" aria-label="Győztes">
          {(
            [
              ["me", props.myName],
              ["draw", "Döntetlen"],
              ["opp", oppName],
            ] as const
          ).map(([value, text]) => (
            <label key={value} title={text}>
              <input type="radio" name="outcome" value={value} className="sr-only" checked={v.outcome === value} onChange={() => set("outcome", value)} />
              {text}
            </label>
          ))}
        </div>
      </section>

      <section className="gr-sec">
        <div>
          <h3>
            Ultik <span className="muted text-xs font-normal">(nem kötelező)</span>
          </h3>
          <p className="muted text-xs">Hányszor dobott ultit (Ultimate) a játszmában.</p>
        </div>
        <div className="gr-two">
          {(
            [
              ["my_ult", props.myName],
              ["opp_ult", oppName],
            ] as const
          ).map(([k, label]) => (
            <label key={k}>
              <span className="label">{label}</span>
              <input type="number" name={k} min={0} max={20} inputMode="numeric" className="input" value={v[k]} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      <section className="gr-sec">
        <label>
          <span className="label">
            {props.mode === "admin" ? "Mikor játszották?" : "Mikor játszottátok?"}
            <InfoTip text="Legfeljebb 7 nappal korábbi játszmát lehet rögzíteni (az első beküldéstől számítva)." />
          </span>
          <input type="datetime-local" name="played_at" className="input" min={props.minWall} max={props.maxWall} value={v.played_at} onChange={(e) => set("played_at", e.target.value)} required />
        </label>
      </section>

      {props.mode === "admin" && (
        <section className="gr-sec">
          <label>
            <span className="label">
              Indoklás
              <InfoTip text="Kötelező. A játszma előzményeiben mindkét játékos látja." />
            </span>
            <textarea name="reason" className="input" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} required />
          </label>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <SubmitButton>{SUBMIT[props.mode]}</SubmitButton>
      </div>
    </form>
  );
}

function HeroPick({ label, name, value, heroes, onChange }: { label: string; name: string; value: string; heroes: readonly string[]; onChange: (h: string) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <span className="gr-hero">
        {value ? <HeroIcon hero={value} /> : <span className="gr-hero-empty" aria-hidden />}
        <select name={name} className="input" value={value} onChange={(e) => onChange(e.target.value)} required>
          <option value="">Válassz hőst…</option>
          {heroes.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
