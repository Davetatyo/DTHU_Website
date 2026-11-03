// The database functions (supabase/migrations/0007_ticket_draws.sql) raise short codes;
// this turns them into Hungarian messages for the page.

const MESSAGES: Record<string, string> = {
  zero_amount: "A jegyek száma nem lehet nulla.",
  missing_reason: "Add meg, miért jár a jegy.",
  unknown_profile: "Nem találom ezt a játékost.",
  not_enough_tickets: "Nincs elég jegy hozzá.",
  invalid_amount: "Legalább egy jeggyel nevezhetsz.",
  unknown_draw: "Nem találom ezt a sorsolást.",
  draw_closed: "Ez a sorsolás már lezárult, nem lehet nevezni.",
  over_limit: "Ebben a sorsolásban ennyi jegyet nem tehetsz be (elérted a felső határt).",
  draw_not_open: "Ez a sorsolás már nem nyitott.",
  draw_not_closed: "A sorsolás még nem zárult le.",
  entries_changed: "A nevezések közben változtak, próbáld újra.",
};

export function ticketErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message ?? "";
  for (const [key, text] of Object.entries(MESSAGES)) if (code.includes(key)) return text;
  return "Valami hiba történt, próbáld újra később.";
}

/** True when the tables of migration 0007 don't exist yet (not applied in Supabase). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? ""));
}
