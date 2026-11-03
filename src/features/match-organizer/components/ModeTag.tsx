import { MATCH_MODE_LABELS, PLAY_MODE_LABELS, type MatchMode, type PlayMode } from "../lib/play-mode";
import "../play-mode.css";

const Screen = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
const Camera = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 11l5-3v8l-5-3" />
  </svg>
);

/** The icon(s) of a mode: a screen for TTS, a camera for webcam, both for Hibrid. */
export function ModeIcon({ mode }: { mode: MatchMode | PlayMode }) {
  if (mode === "tts") return <Screen />;
  if (mode === "webcam") return <Camera />;
  return (
    <>
      <Screen />
      <Camera />
    </>
  );
}

/** Subtle mode label: a match's mode (TTS / Webkamera / Hibrid) or one player's choice. */
export function ModeTag({ mode, player, note }: { mode: MatchMode | PlayMode; player?: boolean; note?: string }) {
  const label = player ? PLAY_MODE_LABELS[mode as PlayMode] : MATCH_MODE_LABELS[mode as MatchMode];
  return (
    <span className="pm-tag">
      <ModeIcon mode={mode} />
      {label}
      {note && <i>{note}</i>}
    </span>
  );
}
