import { awaitingProfile } from "./rights";
import type { Game, GameContext } from "./types";

// Hungarian labels for games. Pure.

export const CONTEXT_LABELS: Record<GameContext, string> = { casual: "Casual", ranked: "Ranked", tournament: "Bajnokság" };

export const RESULT_LABELS = { win: "Győzelem", loss: "Vereség", draw: "Döntetlen" } as const;

/** Status text and its badge tone (globals.css .badge-*), from the viewer's side. */
export function statusLabel(
  game: Pick<Game, "status" | "reported_side" | "profile_a" | "profile_b">,
  viewerId: string,
): { text: string; tone: "pending" | "proposed" | "confirmed" | "played" } {
  switch (game.status) {
    case "pending":
      return awaitingProfile(game) === viewerId
        ? { text: "Jóváhagyásodra vár", tone: "pending" }
        : { text: "Jóváhagyásra vár", tone: "proposed" };
    case "finalized":
      return { text: "Végleges", tone: "confirmed" };
    case "cancelled":
      return { text: "Visszavonva", tone: "played" };
    case "expired":
      return { text: "Lejárt", tone: "played" };
    case "voided":
      return { text: "Érvénytelenítve", tone: "played" };
  }
}

export const EVENT_LABELS: Record<string, string> = {
  reported: "Beküldve",
  corrected: "Javítva",
  confirmed: "Jóváhagyva",
  cancelled: "Visszavonva",
  expired: "Lejárt (7 napig nem jött válasz)",
  voided: "Admin érvénytelenítette",
  admin_edit: "Admin módosította",
  match_locked: "Bajnoki eredmény lezárva",
  match_changed: "Bajnoki eredmény módosítva",
};
