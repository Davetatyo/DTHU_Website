// The database functions in supabase/migrations/0009_dthu_coins.sql raise short codes;
// this turns them into Hungarian messages for the page.

const MESSAGES: Record<string, string> = {
  not_enough_coins: "Nincs elég DTHU coinod hozzá.",
  invalid_quantity: "Legalább 1, legfeljebb 100 jegyet vehetsz egyszerre.",
  invalid_price: "Hibás ár, szólj egy adminnak.",
  zero_amount: "Az összeg nem lehet nulla.",
  missing_reason: "Add meg, miért jár a coin.",
  unknown_profile: "Nem találom ezt a játékost.",
};

export function shopErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message ?? "";
  for (const [key, text] of Object.entries(MESSAGES)) if (code.includes(key)) return text;
  return "Valami hiba történt, próbáld újra később.";
}
