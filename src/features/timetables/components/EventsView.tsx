"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Art, type ArtSpec } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { KIND_LABELS, TENTATIVE_LABEL, type CalendarItem, type EventKind } from "../lib/events";
import "../timetables.css";

/** A confirmed Időpontfoglaló match, shown in the month view. */
export type CalendarMatch = { at: string; a: string; b: string };

const MON = ["", "jan", "feb", "már", "ápr", "máj", "jún", "júl", "aug", "szep", "okt", "nov", "dec"];
const WD = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

/** Tile background for events without a picture, by kind. */
const KIND_ART: Record<EventKind, ArtSpec> = {
  online: { c1: "#4f8fe0", c2: "#8b55d6", g: "swords", plain: true },
  live: { c1: "#d23a4a", c2: "#d4ab52", g: "trophy", plain: true },
  community: { c1: "#d4ab52", c2: "#5eae4a", g: "die", plain: true },
  other: { c1: "#6b6b7a", c2: "#3a3a46", g: "cal", plain: true },
};

function statusChip(e: CalendarItem): [string, string] {
  if (e.past) return ["mut", "Lezajlott"];
  if (e.ongoing) return ["ok", "Folyamatban"];
  if (e.tentative) return ["mut", TENTATIVE_LABEL];
  if (e.pinned) return ["warn", "Kiemelt"];
  return ["info", KIND_LABELS[e.kind]];
}

function EventDialog({ ev, onClose }: { ev: CalendarItem | null; onClose: () => void }) {
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
          <div className="px muted">{ev.dateLabel}</div>
          <h3 className="text-2xl font-bold">{ev.title}</h3>
          {ev.location && <div className="muted">{ev.location}</div>}
          {ev.summary && <p>{ev.summary}</p>}
          <div className="flex flex-wrap gap-2">
            <span className="chip info">{KIND_LABELS[ev.kind]}</span>
            {ev.tentative && <span className="chip mut">{TENTATIVE_LABEL}</span>}
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Wraps a tile or calendar label in the right kind of link (event page, outside site, or the popup). */
function EventLink({
  ev,
  onPick,
  className,
  title,
  children,
}: {
  ev: CalendarItem;
  onPick: (e: CalendarItem) => void;
  className: string;
  title?: string;
  children: React.ReactNode;
}) {
  if (ev.href && ev.external) {
    return (
      <a href={ev.href} target="_blank" rel="noopener noreferrer" className={className} title={title}>
        {children}
      </a>
    );
  }
  if (ev.href) {
    return (
      <Link href={ev.href} className={className} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} title={title} onClick={() => onPick(ev)}>
      {children}
    </button>
  );
}

function Tile({ ev, onPick }: { ev: CalendarItem; onPick: (e: CalendarItem) => void }) {
  const [, m, d] = ev.startDay.split("-");
  const [chipClass, chipLabel] = statusChip(ev);
  return (
    <EventLink ev={ev} onPick={onPick} className={`tile${ev.past ? " past" : ""}${ev.tentative ? " tentative" : ""}`}>
      <Art spec={ev.cover ? { img: ev.cover } : KIND_ART[ev.kind]} />
      <span className="badge-tl datebadge">
        <b>{+d}</b>
        <small>{MON[+m]}</small>
      </span>
      <span className="badge-tr">
        <span className={`chip ${chipClass}`}>{chipLabel}</span>
      </span>
      <div className="in">
        <h3>
          {ev.title}
          {ev.external && <span aria-label="(külső oldal)"> ↗</span>}
        </h3>
        <span className="sub">{[ev.dateLabel, ev.location].filter(Boolean).join(" · ")}</span>
      </div>
    </EventLink>
  );
}

function MonthView({ items, matches, onPick }: { items: CalendarItem[]; matches: CalendarMatch[]; onPick: (e: CalendarItem) => void }) {
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
          const evs = items.filter((e) => e.startDay <= k && k <= e.endDay);
          const ms = byDay[k] ?? [];
          return (
            <div key={k} className={`day${d.getMonth() !== mo ? " out" : ""}${k === today ? " today" : ""}${ms.length ? " mdot" : ""}`}>
              <span className="dn">{d.getDate()}</span>
              {evs.map((e) => (
                <EventLink key={e.key} ev={e} onPick={onPick} className={`evl ${e.kind}${e.tentative ? " tentative" : ""}`} title={e.title}>
                  {/* The title on the first day and on Mondays; a non-breaking space keeps the bar's height elsewhere. */}
                  {k === e.startDay || d.getDay() === 1 ? e.title : "\u00a0"}
                </EventLink>
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
        <span className="lg-online">{KIND_LABELS.online}</span>
        <span className="lg-live">{KIND_LABELS.live}</span>
        <span className="lg-community">{KIND_LABELS.community}</span>
        <span className="lg-other">{KIND_LABELS.other}</span>
        <span className="lg-match">Megerősített meccs</span>
      </div>
    </div>
  );
}

/**
 * Eseménynaptár: event tiles or a month calendar (choice remembered in this browser). Past
 * events stay visible, greyed out, in "Elmúlt események" under the tiles.
 */
export function EventsView({ upcoming, past, matches }: { upcoming: CalendarItem[]; past: CalendarItem[]; matches: CalendarMatch[] }) {
  const [view, setView] = useState<"tiles" | "cal">("tiles");
  const [open, setOpen] = useState<CalendarItem | null>(null);
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
        <MonthView items={[...upcoming, ...past]} matches={matches} onPick={setOpen} />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <div className="cards tall">
              {upcoming.map((e) => (
                <Tile key={e.key} ev={e} onPick={setOpen} />
              ))}
            </div>
          ) : (
            <p className="card muted">Most nincs közelgő esemény. Nézz vissza később!</p>
          )}
          {past.length > 0 && (
            <section className="ev-archive" aria-labelledby="ev-archive-h">
              <h2 id="ev-archive-h">Elmúlt események</h2>
              <div className="cards">
                {past.map((e) => (
                  <Tile key={e.key} ev={e} onPick={setOpen} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      <EventDialog ev={open} onClose={() => setOpen(null)} />
    </div>
  );
}
