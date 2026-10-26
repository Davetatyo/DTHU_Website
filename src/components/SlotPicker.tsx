"use client";

import { useState } from "react";
import type { PickerDay } from "@/lib/time";
import { SubmitButton } from "./SubmitButton";

// Pick a day from a calendar strip, then type the time. Selected slots are submitted
// as hidden "slot" inputs in "YYYY-MM-DDTHH:mm" form (wall time in the viewer's zone).

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
  const dayHasTimes = (key: string) => `${key}T23:59` >= min && (!max || `${key}T00:00` <= max);
  const firstDay = days.find((d) => dayHasTimes(d.key))?.key ?? null;

  const [dayKey, setDayKey] = useState<string | null>(firstDay);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dayLabel = (key: string) => days.find((d) => d.key === key)?.label ?? key;

  // Earliest/latest time allowed on the chosen day, shown as a hint.
  const dayMin = dayKey && min.startsWith(dayKey) ? min.slice(11) : null;
  const dayMax = dayKey && max?.startsWith(dayKey) ? max.slice(11) : null;
  const full = maxSlots > 1 && selected.length >= maxSlots;

  function add() {
    if (!dayKey) return;
    if (!/^\d{2}:\d{2}$/.test(time)) return setError("Adj meg egy időpontot (óra:perc).");
    const slot = `${dayKey}T${time}`;
    if (slot < min) return setError("Ez az időpont már elmúlt.");
    if (max && slot > max) return setError("Ez az időpont a forduló határideje után van.");
    if (selected.includes(slot)) return setError("Ezt az időpontot már hozzáadtad.");
    setError(null);
    setSelected(maxSlots === 1 ? [slot] : [...selected, slot].sort());
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
          <label className="block font-semibold first-letter:uppercase" htmlFor="slot-time">
            {dayLabel(dayKey)}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="slot-time"
              type="time"
              step={300}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                // Enter adds the time instead of submitting the whole form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="input w-36 text-lg font-semibold"
            />
            <button type="button" onClick={add} disabled={full} className="btn btn-secondary">
              {maxSlots === 1 ? "Kiválasztom" : "+ Hozzáadás"}
            </button>
          </div>
          {(dayMin || dayMax) && (
            <p className="muted text-xs">
              Ezen a napon {dayMin ? `${dayMin} után` : ""}
              {dayMin && dayMax ? " és " : ""}
              {dayMax ? `${dayMax} előtt` : ""} választhatsz.
            </p>
          )}
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          {full && <p className="muted text-xs">Elérted a {maxSlots} időpontot. Törölj egyet, ha cserélnéd.</p>}
        </div>
      )}

      <div className="space-y-2">
        <div className="muted text-sm">
          {maxSlots > 1 ? `Kiválasztva: ${selected.length} / ${maxSlots}` : selected.length ? "Kiválasztva:" : "Válassz egy időpontot."}
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
              {dayLabel(s.slice(0, 10))} {s.slice(11)} ✕
            </button>
          ))}
        </div>
        {selected.map((s) => (
          <input key={s} type="hidden" name="slot" value={s} />
        ))}
        <SubmitButton disabled={selected.length === 0}>{submitLabel}</SubmitButton>
      </div>
    </div>
  );
}
