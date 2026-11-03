"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { acceptProposal } from "../actions/match";
import { PLAY_MODE_LABELS, type PlayMode } from "../lib/play-mode";
import { ModeIcon } from "./ModeTag";

/** TTS / Webkamera buttons; tapping the chosen one again clears it (not chosen = webcam). */
function ModeButtons({ value, onChange }: { value: PlayMode | null; onChange: (v: PlayMode | null) => void }) {
  return (
    <div className="pm-seg" role="radiogroup" aria-label="Játékmód">
      {(["tts", "webcam"] as const).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={value === m} className={value === m ? "on" : ""} onClick={() => onChange(value === m ? null : m)}>
          <ModeIcon mode={m} />
          {m === "tts" ? "TTS (Tabletop Simulator)" : PLAY_MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

const Question = ({ text }: { text: string }) => (
  <p className="pm-q">
    {text} <span>(nem kötelező, alapból webkamera)</span>
  </p>
);

/** In the propose form: the proposer's own choice, sent with "Javaslat küldése". */
export function PlayModeField({ initial }: { initial: PlayMode | null }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <Question text="Hogyan játszol ezen a meccsen?" />
      <ModeButtons value={value} onChange={setValue} />
      <input type="hidden" name="play_mode" value={value ?? ""} />
    </div>
  );
}

/** The opponent's proposed times with "Elfogadom", plus the accepting player's own choice. */
export function AcceptWithMode({
  matchId,
  proposals,
  initial,
}: {
  matchId: string;
  proposals: { id: string; label: string }[];
  initial: PlayMode | null;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="mt-3">
      <Question text="Te hogyan játszol?" />
      <ModeButtons value={value} onChange={setValue} />
      <ul className="mt-3 space-y-2">
        {proposals.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium first-letter:uppercase">{p.label}</span>
            <form action={acceptProposal}>
              <input type="hidden" name="match_id" value={matchId} />
              <input type="hidden" name="proposal_id" value={p.id} />
              <input type="hidden" name="play_mode" value={value ?? ""} />
              <SubmitButton className="btn btn-sm">Elfogadom</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
