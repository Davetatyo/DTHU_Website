"use client";

import { useEffect, useRef, useState } from "react";
import { HeroAvatar } from "@/components/HeroAvatar";
import { SubmitButton } from "@/components/SubmitButton";
import { confirmResult, submitResult } from "@/features/championships/actions/results";
import type { MatchReport, ReportOutcome } from "@/features/championships/lib/types";
import "../championships.css";

type Side = { name: string; heroes: string[] };

/**
 * The slide-in result panel of one match (button + drawer). Players report the winner, final
 * health, and which hero each played and had banned; the opponent confirms or corrects it.
 * The server decides what's allowed (actions/results.ts); this only mirrors it in the UI.
 */
export function ResultPanel({
  matchId,
  back,
  a,
  b,
  report,
  viewerSide,
  canSubmit,
  canConfirm,
  locksOnSubmit,
  label,
  highlight,
}: {
  matchId: string;
  back: string;
  a: Side;
  b: Side;
  report: MatchReport | null;
  viewerSide: "a" | "b" | null;
  canSubmit: boolean;
  canConfirm: boolean;
  locksOnSubmit: boolean;
  label: string;
  highlight?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<ReportOutcome | "">(report?.outcome ?? "");
  const [hp, setHp] = useState({ a: report ? String(report.hp_a) : "", b: report ? String(report.hp_b) : "" });
  const [picks, setPicks] = useState({
    pick_a: report?.pick_a ?? "",
    ban_a: report?.ban_a ?? "",
    pick_b: report?.pick_b ?? "",
    ban_b: report?.ban_b ?? "",
  });

  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  // Like Karnyx: entering the health picks the winner (the one left standing; both on 0 = draw).
  function changeHp(side: "a" | "b", value: string) {
    const next = { ...hp, [side]: value };
    setHp(next);
    if (next.a === "" || next.b === "") return;
    const ha = Number(next.a);
    const hb = Number(next.b);
    if (ha > 0 && hb === 0) setOutcome("a");
    else if (hb > 0 && ha === 0) setOutcome("b");
    else if (ha === 0 && hb === 0) setOutcome("draw");
  }

  const submitter = report?.submitted_side === "a" ? a.name : report?.submitted_side === "b" ? b.name : "Admin";
  const status = !report ? null : report.confirmed_at ? "locked" : "pending";

  return (
    <>
      <button type="button" className={highlight ? "btn btn-sm" : "btn btn-sm btn-secondary"} onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog ref={ref} className="res-drawer" onClose={() => setOpen(false)} aria-label="Meccs eredménye">
        <div className="res-body">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Meccs eredménye</h2>
              <p className="muted text-sm">
                {a.name} vs {b.name}
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(false)} aria-label="Bezárás">
              ✕
            </button>
          </div>

          {status === "pending" && canConfirm && (
            <div className="alert-info space-y-2 rounded-lg p-3 text-sm">
              <p>
                <strong>{submitter}</strong> beküldte az eredményt (lent látod). Ha minden stimmel, hagyd jóvá, és az eredmény
                végleges lesz. Ha valami nem jó, javítsd ki lent: akkor a javításod vár {submitter} jóváhagyására.
              </p>
              <form action={confirmResult}>
                <input type="hidden" name="match_id" value={matchId} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="submitted_at" value={report!.submitted_at} />
                <SubmitButton className="btn btn-sm">Jóváhagyom</SubmitButton>
              </form>
            </div>
          )}
          {status === "pending" && !canConfirm && viewerSide && (
            <p className="alert-info rounded-lg p-3 text-sm">
              Elküldted, az ellenfeled jóváhagyására vár. Addig még módosíthatod.
            </p>
          )}
          {status === "pending" && !viewerSide && (
            <p className="alert-info rounded-lg p-3 text-sm">
              {submitter} küldte be, a másik játékos jóváhagyására vár. Ha most mented, az eredmény azonnal végleges.
            </p>
          )}
          {status === "locked" && (
            <p className="alert-ok rounded-lg p-3 text-sm">
              Végleges eredmény{report!.submitted_side === "admin" ? " (admin rögzítette)" : ": mindkét játékos elfogadta"}.
              {canSubmit && " Adminként módosíthatod; a módosítás azonnal érvényes."}
            </p>
          )}

          <form action={submitResult} className="flex flex-col gap-5">
            <input type="hidden" name="match_id" value={matchId} />
            <input type="hidden" name="back" value={back} />
            <fieldset disabled={!canSubmit} className="flex flex-col gap-5">
              <section className="flex flex-col gap-2">
                <h3>Győztes</h3>
                <div className="res-outcome" role="radiogroup" aria-label="Győztes">
                  {(
                    [
                      ["a", a.name],
                      ["draw", "Döntetlen"],
                      ["b", b.name],
                    ] as const
                  ).map(([value, text]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="outcome"
                        value={value}
                        className="sr-only"
                        checked={outcome === value}
                        onChange={() => setOutcome(value)}
                      />
                      {text}
                    </label>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <div>
                  <h3>Választás és kitiltás</h3>
                  <p className="muted text-xs">Melyik hősével játszott, és melyik hősét tiltotta ki az ellenfele.</p>
                </div>
                {(["a", "b"] as const).map((s) => {
                  const p = s === "a" ? a : b;
                  if (p.heroes.length === 0) return null;
                  const pickKey = `pick_${s}` as const;
                  const banKey = `ban_${s}` as const;
                  return (
                    <div key={s} className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">{p.name}</span>
                      <div className="res-player">
                        <HeroRow
                          title="Választott"
                          name={pickKey}
                          heroes={p.heroes}
                          value={picks[pickKey]}
                          disabledHero={picks[banKey]}
                          onChange={(h) => setPicks({ ...picks, [pickKey]: h })}
                        />
                        <HeroRow
                          title="Kitiltott"
                          name={banKey}
                          heroes={p.heroes}
                          value={picks[banKey]}
                          disabledHero={picks[pickKey]}
                          onChange={(h) => setPicks({ ...picks, [banKey]: h })}
                          ban
                        />
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="flex flex-col gap-2">
                <div>
                  <h3>Életerő</h3>
                  <p className="muted text-xs">A játék végén maradt életerő. Kitöltéskor a győztest is beállítja.</p>
                </div>
                <div className="res-player">
                  {(["a", "b"] as const).map((s) => (
                    <label key={s} className="res-hp">
                      <span className="font-semibold">{s === "a" ? a.name : b.name}</span>
                      <input
                        type="number"
                        name={`hp_${s}`}
                        min={0}
                        max={99}
                        inputMode="numeric"
                        className="input"
                        value={hp[s]}
                        onChange={(e) => changeHp(s, e.target.value)}
                        required
                      />
                    </label>
                  ))}
                </div>
              </section>
            </fieldset>

            {canSubmit && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Mégse
                </button>
                <SubmitButton>
                  {locksOnSubmit ? "Mentés (végleges)" : status === "pending" && canConfirm ? "Javítás elküldése" : "Eredmény elküldése"}
                </SubmitButton>
              </div>
            )}
          </form>
        </div>
      </dialog>
    </>
  );
}

function HeroRow({
  title,
  name,
  heroes,
  value,
  disabledHero,
  onChange,
  ban,
}: {
  title: string;
  name: string;
  heroes: string[];
  value: string;
  disabledHero: string;
  onChange: (hero: string) => void;
  ban?: boolean;
}) {
  return (
    <div className={`res-row${ban ? " res-ban" : ""}`} role="radiogroup" aria-label={title}>
      <span className="min-w-0">
        {title}
        <small className="muted block truncate font-normal">{value || "válassz"}</small>
      </span>
      <div className="res-heroes">
        {heroes.map((h) => (
          <label key={h} className="res-hero" title={h}>
            <input
              type="radio"
              name={name}
              value={h}
              className="sr-only"
              checked={value === h}
              disabled={disabledHero === h}
              onChange={() => onChange(h)}
              aria-label={h}
            />
            <HeroAvatar name={h} hero={h} />
          </label>
        ))}
      </div>
    </div>
  );
}
