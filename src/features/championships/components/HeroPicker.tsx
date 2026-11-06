"use client";

import { useState } from "react";
import { HEROES_PER_PLAYER } from "@/features/championships/lib/rules";

/** Three hero dropdowns; a hero picked in one slot is disabled in the others. */
export function HeroPicker({ heroes, initial, disabled }: { heroes: readonly string[]; initial: string[]; disabled?: boolean }) {
  const [picks, setPicks] = useState<string[]>(() =>
    Array.from({ length: HEROES_PER_PLAYER }, (_, i) => initial[i] ?? ""),
  );

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {picks.map((value, i) => (
        <div key={i}>
          <label className="label" htmlFor={`hero_${i + 1}`}>
            {i + 1}. hős
          </label>
          <select
            id={`hero_${i + 1}`}
            name={`hero_${i + 1}`}
            className="input w-full"
            value={value}
            disabled={disabled}
            required
            onChange={(e) => setPicks((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
          >
            <option value="">Válassz…</option>
            {heroes.map((h) => (
              <option key={h} value={h} disabled={picks.some((p, j) => j !== i && p === h)}>
                {h}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
