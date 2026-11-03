"use client";

import { routes } from "@/lib/routes";
import { isPublicInPhase1 } from "@/lib/site-mode";
import { VIEW_AS_COOKIE, VIEW_AS_PLAYER } from "@/lib/view-as";

/**
 * Admin-only switch between the admin view and the player view (what a non-admin sees).
 * Reloads the page so the server renders it the other way; from a page players can't open,
 * the player view starts at the Meccsszervező.
 */
export function ViewAsToggle({ playerView }: { playerView: boolean }) {
  function toggle() {
    const next = !playerView;
    document.cookie = next
      ? `${VIEW_AS_COOKIE}=${VIEW_AS_PLAYER}; path=/; max-age=31536000; samesite=lax`
      : `${VIEW_AS_COOKIE}=; path=/; max-age=0; samesite=lax`;
    if (next && !isPublicInPhase1(location.pathname)) location.assign(routes.organizer);
    else location.reload();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!playerView}
      onClick={toggle}
      className={`view-switch${playerView ? " player" : ""}`}
      title={playerView ? "Most játékosként látod az oldalt. Kattints az admin nézethez." : "Kattints, és úgy látod az oldalt, mint egy játékos."}
    >
      <span className="knob" aria-hidden />
      <span className="lbl">{playerView ? "Játékos nézet" : "Admin nézet"}</span>
    </button>
  );
}
