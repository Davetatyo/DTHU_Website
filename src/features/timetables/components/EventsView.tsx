"use client";

import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { EVART, EVENTS, type EventItem } from "../data/events";
import "../timetables.css";

/** A confirmed Meccsszervező match, shown in the month view. */
export type CalendarMatch = { at: string; a: string; b: string };

const MON = ["", "jan", "feb", "már", "ápr", "máj", "jún", "júl", "aug", "szep", "okt", "nov", "dec"];
const WD = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

function EventDialog({ ev, onClose }: { ev: EventItem | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ev && !ref.current?.open) ref.current?.showModal();
    if (!ev && ref.current?.open) ref.current.close();
  }, [ev]);
  return (
    <dialog ref={ref} className="dlg" onClose={onClose}>
      <div className="dh">
        <span>Esemény</span>
        <button type="button" onClick={onClose} aria-label="Bezárás">
          [x]
        </button>
      </div>
      {ev && (
        <div className="db">
          <div className="px muted">{ev.d}</div>
          <h3 className="text-2xl font-bold">{ev.t}</h3>
          <div className="muted">{ev.where}</div>
          <p>{ev.desc}</p>
          <div className="flex flex-wrap gap-2">
            {ev.tags.map(([c, l]) => (
              <span key={l} className={`chip ${c}`}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}

function MonthView({ matches, onPick }: { matches: CalendarMatch[]; onPick: (e: EventItem) => void }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const y = month.getFullYear();
  const mo = month.getMonth();
  const start = new Date(y, mo, 1 - ((new Date(y, mo, 1).getDay() + 6) % 7));
  const today = ymd(new Date());
  const byDay: Record<string, CalendarMatch[]> = {};
  matches.forEach((m) => (byDay[ymd(new Date(m.at))] ??= []).push(m));

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (i >= 35 && d.getMonth() !== mo) break;
    days.push(d);
  }

  return (
    <div>
      <div className="calhead">
        <button className="btn btn-secondary btn-sm" onClick={() => setMonth(new Date(y, mo - 1, 1))} aria-label="Előző hónap">
          ‹ Előző
        </button>
        <h2>{month.toLocaleDateString("hu-HU", { year: "numeric", month: "long" })}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setMonth(new Date(y, mo + 1, 1))} aria-label="Következő hónap">
          Következő ›
        </button>
      </div>
      <div className="cal">
        {WD.map((w) => (
          <div key={w} className="wd">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const k = ymd(d);
          const evs = EVENTS.filter((e) => e.s <= k && k <= e.e);
          const ms = byDay[k] ?? [];
          return (
            <div key={k} className={`day${d.getMonth() !== mo ? " out" : ""}${k === today ? " today" : ""}${ms.length ? " mdot" : ""}`}>
              <span className="dn">{d.getDate()}</span>
              {evs.map((e) => (
                <button key={e.t} type="button" className={`evl ${e.k}`} title={e.t} onClick={() => onPick(e)}>
                  {k === e.s || d.getDay() === 1 ? e.t : " "}
                </button>
              ))}
              {ms.map((m) => (
                <span key={m.a + m.at} className="mt" title={`${m.a} vs ${m.b}`}>
                  {hhmm(m.at)} {m.a}–{m.b}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span style={{ color: "var(--info)" }}>Online forduló</span>
        <span style={{ color: "var(--warn)" }}>Élő esemény</span>
        <span style={{ color: "var(--muted)" }}>Ötlet</span>
        <span style={{ color: "var(--gold)" }}>Megerősített meccs</span>
      </div>
    </div>
  );
}

/** Versenynaptár: event tiles or a month calendar (choice remembered in this browser). */
export function EventsView({ matches }: { matches: CalendarMatch[] }) {
  const [view, setView] = useState<"tiles" | "cal">("tiles");
  const [open, setOpen] = useState<EventItem | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem("dthu:calView") === "cal") setView("cal");
    } catch {}
  }, []);
  function choose(v: "tiles" | "cal") {
    setView(v);
    try {
      localStorage.setItem("dthu:calView", v);
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="seg2" role="group" aria-label="Nézet">
        <button type="button" aria-pressed={view === "tiles"} onClick={() => choose("tiles")}>
          <Icon id="scroll" className="mr-1 inline h-4 w-4" />
          Csempék
        </button>
        <button type="button" aria-pressed={view === "cal"} onClick={() => choose("cal")}>
          <Icon id="cal" className="mr-1 inline h-4 w-4" />
          Naptár
        </button>
      </div>

      {view === "cal" ? (
        <MonthView matches={matches} onPick={setOpen} />
      ) : (
        <div className="cards tall">
          {EVENTS.map((e, i) => {
            const [, m, d] = e.s.split("-");
            return (
              <button key={e.t} type="button" className="tile" onClick={() => setOpen(e)}>
                <Art spec={EVART[i]} />
                <span className="badge-tl datebadge">
                  <b>{+d}</b>
                  <small>{MON[+m]}</small>
                </span>
                <span className="badge-tr">
                  {e.tags.slice(0, 1).map(([c, l]) => (
                    <span key={l} className={`chip ${c}`}>
                      {l}
                    </span>
                  ))}
                </span>
                <div className="in">
                  <h3>{e.t}</h3>
                  <span className="sub">{e.where}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <EventDialog ev={open} onClose={() => setOpen(null)} />
    </div>
  );
}
