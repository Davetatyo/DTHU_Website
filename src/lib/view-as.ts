// Admins can look at the site as a player sees it (header switch "Admin nézet / Játékos nézet").
// The choice is a cookie, read by the middleware and the server components. It only changes
// what is shown: server actions still check the real admin flag.

export const VIEW_AS_COOKIE = "nezet_mint";
export const VIEW_AS_PLAYER = "jatekos";

/** True when this visitor wants the player view (only meaningful for admins). */
export function wantsPlayerView(cookieValue: string | undefined): boolean {
  return cookieValue === VIEW_AS_PLAYER;
}
