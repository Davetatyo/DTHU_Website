"use client";

import { useState } from "react";
import { CUSTOM_NAME, NOT_PLAYING } from "@/lib/profile";

/** Karnyx name picker: roster names, "Egyedi" (typed name) or "Nem játszom". */
export function KarnyxNameField({
  names,
  ownName,
  defaultChoice,
  defaultCustom,
}: {
  names: string[];
  ownName: string | null;
  defaultChoice: string;
  defaultCustom: string;
}) {
  const [choice, setChoice] = useState(defaultChoice);

  return (
    <div className="space-y-2">
      <select
        id="karnyx_name"
        name="karnyx_name"
        className="input"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        required
      >
        <option value="" disabled>
          Válassz…
        </option>
        <option value={NOT_PLAYING}>Nem játszom ebben a versenyben (szervező / néző)</option>
        <option value={CUSTOM_NAME}>Egyedi név (nincs a listában)…</option>
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
            {ownName && n.toLowerCase() === ownName.toLowerCase() ? " (te)" : ""}
          </option>
        ))}
      </select>
      {choice === CUSTOM_NAME && (
        <input
          name="karnyx_custom"
          className="input"
          defaultValue={defaultCustom}
          placeholder="Karnyx neved pontosan, ahogy a Karnyxban szerepel"
          maxLength={40}
          autoComplete="off"
          required
          autoFocus
        />
      )}
    </div>
  );
}
