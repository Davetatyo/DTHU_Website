import type { LevelInfo } from "../lib/levels";
import "../xp.css";

/** Progress to the next level. `big` with the numbers inside, for the profile. */
export function XpBar({ info, big, pct }: { info: LevelInfo; big?: boolean; pct?: number }) {
  return (
    <div className={`xp-bar${big ? " big" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={info.to - info.from} aria-valuenow={info.into} aria-label={`${info.level + 1}. szintig`}>
      <div className="xp-fill" style={{ width: `${pct ?? info.pct}%` }} />
      {big && (
        <span className="xp-bar-text">
          {info.into} / {info.to - info.from} XP
        </span>
      )}
    </div>
  );
}
