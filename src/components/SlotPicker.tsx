"use client";

import { useId, useState } from "react";
import type { PickerDay } from "@/lib/time";
import { SubmitButton } from "./SubmitButton";

// Pick a day from a calendar strip, then type the time. Slots are submitted as hidden "slot"
// inputs in "YYYY-MM-DDTHH:mm" form (wall time in the viewer's zone).
//
// The day + time currently on screen is the "draft". With one slot (admin "set time") the draft
// IS the choice and follows every change. With several slots, added times become chips; a draft
// the user typed but didn't add is still sent (shown as a dashed chip), using the day selected
// at that moment, so changing the day after typing a time never leaves a stale date behind.

const DEFAULT_TIME = "20:00";

export function SlotPicker({
  days,
  min,
  max,
  maxSlots,
  submitLabel,
}: {
  days: PickerDay[];
  min: string;
  max: string | null;
  maxSlots: number;
  submitLabel: string;
}) {
  const single = maxSlots === 1;
  const timeId = useId();
  const dayHasTimes = (key: string) => `${key}T23:59` >= min && (!max || `${key}T00:00` <= max);
  const firstDay = days.find((d) => dayHasTimes(d.key))?.key ?? null;

  const [dayKey, setDayKey] = useState<string | null>(firstDay);
  const [time, setTime] = useState(DEFAULT_TIME);
  // Multi-slot only: the user typed a time that isn't added yet.
  const [timeTouched, setTimeTouched] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dayLabel = (key: string) => days.find((d) => d.key === key)?.label ?? key;
  const slotLabel = (slot: string) => `${dayLabel(slot.slice(0, 10))} ${slot.slice(11)}`;

  // Earliest/latest time allowed on the chosen day, shown as a hint.
  const dayMin = dayKey && min.startsWith(dayKey) ? min.slice(11) : null;
  const dayMax = dayKey && max?.startsWith(dayKey) ? max.slice(11) : null;
  const full = !single && selected.length >= maxSlots;

  function problemWith(slot: string | null): string | null {
    if (!slot || !/T\d{2}:\d{2}$/.test(slot)) return "Adj meg egy időpontot (óra:perc).";
    if (slot < min) return "Ez az időpont már elmúlt.";
    if (max && slot > max) return "Ez az időpont a forduló határideje után van.";
    if (selected.includes(slot)) return "Ezt az időpontot már hozzáadtad.";
    return null;
  }

  const draft = dayKey && time ? `${dayKey}T${time}` : null;
  const draftProblem = problemWith(draft);
  // What gets sent: one slot follows the draft; several slots = chips + an unadded typed draft.
  const pendingDraft = !single && timeTouched && !full && !draftProblem ? draft : null;
  const toSubmit = single ? (draftProblem ? [] : [draft!]) : [...selected, ...(pendingDraft ? [pendingDraft] : [])];

  function add() {
    if (draftProblem) return setError(draftProblem);
    setError(null);
    setSelected([...selected, draft!].sort());
    setTimeTouched(false);
  }

  if (!firstDay) return <p className="muted text-sm">Nincs már választható időpont a határidőig.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((d) => {
          const enabled = dayHasTimes(d.key);
          const active = d.key === dayKey;
          const count = selected.filter((s) => s.startsWith(d.key)).length;
          return (
            <button
              key={d.key}
              type="button"
              disabled={!enabled}
              onClick={() => {
                setDayKey(d.key);
                setError(null);
              }}
              className="relative rounded-lg border px-1 py-2 text-center disabled:opacity-35"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent)" : "var(--bg)",
                color: active ? "var(--accent-text)" : "var(--text)",
              }}
            >
              <div className="text-xs capitalize">{d.weekday}</div>
              <div className="text-xl font-bold leading-tight">{d.day}</div>
              <div className="text-xs">{d.month}</div>
              {count > 0 && (
                <span
                  className="absolute -right-1 -top-1 rounded-full px-1.5 text-xs font-bold"
                  style={{ background: "var(--ok)", color: "var(--surface)" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {dayKey && (
        <div className="space-y-2">
          <label className="block font-semibold first-letter:uppercase" htmlFor={timeId}>
            {dayLabel(dayKey)}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={timeId}
              type="time"
              step={300}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setTimeTouched(true);
                setError(null);
              }}
              onKeyDown={(e) => {
                // Enter adds the time (multi-slot) instead of submitting the whole form.
                if (e.key === "Enter" && !single) {
                  e.preventDefault();
                  add();
                }
              }}
              className="input w-36 text-lg font-semibold"
            />
            {!single && (
              <button type="button" onClick={add} disabled={full} className="btn btn-secondary">
                + Hozzáadás
              </button>
            )}
          </div>
          {(dayMin || dayMax) && (
            <p className="muted text-xs">
              Ezen a napon {dayMin ? `${dayMin} után` : ""}
              {dayMin && dayMax ? " és " : ""}
              {dayMax ? `${dayMax} előtt` : ""} választhatsz.
            </p>
          )}
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          {single && draftProblem && <p className="text-sm" style={{ color: "var(--danger)" }}>{draftProblem}</p>}
          {!single && timeTouched && !full && draftProblem && !error && (
            <p className="text-sm" style={{ color: "var(--warn)" }}>
              A beírt időpont nem küldhető: {draftProblem.charAt(0).toLowerCase() + draftProblem.slice(1)}
            </p>
          )}
          {full && <p className="muted text-xs">Elérted a {maxSlots} időpontot. Törölj egyet, ha cserélnéd.</p>}
        </div>
      )}

      <div className="space-y-2">
        {single ? (
          <div className="text-sm">
            <span className="muted">Kiválasztott időpont: </span>
            {draftProblem ? (
              <span className="muted">nincs</span>
            ) : (
              <strong className="first-letter:uppercase">{slotLabel(draft!)}</strong>
            )}
          </div>
        ) : (
          <>
            <div className="muted text-sm">
              Kiválasztva: {toSubmit.length} / {maxSlots}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelected(selected.filter((x) => x !== s))}
                  className="badge badge-confirmed text-sm first-letter:uppercase"
                  title="Eltávolítás"
                >
                  {slotLabel(s)} ✕
                </button>
              ))}
              {pendingDraft && (
                <span
                  className="badge text-sm first-letter:uppercase"
                  style={{ border: "1px dashed var(--ok)", color: "var(--ok)" }}
                  title="Még nincs hozzáadva, de küldéskor bekerül"
                >
                  + {slotLabel(pendingDraft)} (küldéskor bekerül)
                </span>
              )}
            </div>
          </>
        )}
        {toSubmit.map((s) => (
          <input key={s} type="hidden" name="slot" value={s} />
        ))}
        <SubmitButton disabled={toSubmit.length === 0}>{submitLabel}</SubmitButton>
      </div>
    </div>
  );
}
