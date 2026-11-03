// Database error codes of the daily games (migration 0010) → Hungarian messages.

const MESSAGES: Record<string, string> = {
  already_spun: "Ma már pörgettél. Éjfélkor (budapesti idő) újra lehet.",
  already_answered: "Ma már válaszoltál. Éjfélkor (budapesti idő) jön az új kérdés.",
  wrong_question: "Közben új nap kezdődött, töltsd újra az oldalt.",
  unknown_profile: "A fiókoddal most nem lehet játszani. Szólj egy adminnak.",
  invalid_prize: "Hibás nyereménytábla, szólj egy adminnak.",
  duplicate_key: "Erre a napra már van kérdés ütemezve.",
  publish_date_key: "Erre a napra már van kérdés ütemezve.",
};

export function dailyErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message ?? "";
  for (const [key, text] of Object.entries(MESSAGES)) if (code.includes(key)) return text;
  return "Valami hiba történt, próbáld újra később.";
}
