import type { MatchStatus } from "./types";

export const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "Nincs időpont",
  proposed: "Időpont javasolva",
  confirmed: "Megerősítve",
  played: "Lejátszva",
  bye: "Bye",
};

export const STATUS_CLASS: Record<MatchStatus, string> = {
  pending: "badge-pending",
  proposed: "badge-proposed",
  confirmed: "badge-confirmed",
  played: "badge-played",
  bye: "badge-played",
};
