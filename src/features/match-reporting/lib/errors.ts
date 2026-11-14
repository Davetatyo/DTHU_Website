// The game_* functions (migration 0014) fail with short codes (or a check constraint's name);
// this turns them into Hungarian text for the page.

const MESSAGES: Record<string, string> = {
  report_changed: "Közben változott a játszma, frissítsd az oldalt és nézd meg újra.",
  not_pending: "Ez a játszma már nem vár jóváhagyásra.",
  not_open: "Ez a játszma már le van zárva.",
  not_allowed: "Ehhez a játszmához ezt nem teheted meg.",
  unknown_game: "A játszma nem található.",
  tournament_game: "Bajnoksági meccs eredményét a bajnokság oldalán lehet módosítani.",
  invalid_context: "Válaszd ki, hogy casual vagy ranked játszma volt.",
  invalid_players: "Válassz egy másik játékost ellenfélnek.",
  unknown_or_banned_player: "Ezzel a játékossal most nem rögzíthetsz játszmát.",
  reason_required: "Írd be az indoklást.",
  missing_played_at: "Add meg, mikor játszottátok.",
  played_too_long_ago: "Legfeljebb 7 nappal korábbi játszmát lehet rögzíteni.",
  played_in_future: "A játszma időpontja nem lehet a jövőben.",
  games_winner_hp: "A győztes nem végezhet 0 életerővel. Ha mindketten 0-n álltok, az döntetlen.",
  games_two_players: "Válassz egy másik játékost ellenfélnek.",
  games_heroes: "Mindkét játékosnál válaszd ki a hőst a listából.",
};

const FALLBACK = "Nem sikerült menteni, próbáld újra.";

/** Hungarian text for a database error message; unknown errors get a generic text. */
export function gameErrorMessage(message: string | null | undefined): string {
  if (!message) return FALLBACK;
  const code = Object.keys(MESSAGES).find((key) => new RegExp(`\\b${key}\\b`).test(message));
  return code ? MESSAGES[code] : FALLBACK;
}
