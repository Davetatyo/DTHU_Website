import type { Game, GameSide } from "./types";

// Who may see and do what with a game. Mirrors the game_* functions (migration 0014), which
// check the same again. Championship games are only read here: their result is changed on the
// Bajnokságok match (championships/lib/results.ts).

type GameRef = Pick<Game, "status" | "context" | "profile_a" | "profile_b" | "reported_side">;
export type Viewer = { id: string; admin: boolean };

export type GameRights = {
  canView: boolean;
  /** Elfogadom / Javítom: the player who has to answer a pending report. */
  canRespond: boolean;
  /** Visszavonom: the player whose version is pending. */
  canCancel: boolean;
  /** Admin edit with a reason (settles a pending game). */
  canAdminEdit: boolean;
  /** Admin void with a reason. */
  canVoid: boolean;
};

export function gameSide(game: Pick<Game, "profile_a" | "profile_b">, profileId: string): GameSide | null {
  if (profileId === game.profile_a) return "a";
  if (profileId === game.profile_b) return "b";
  return null;
}

/** The profile who has to answer a pending game (the other side of the current version). */
export function awaitingProfile(game: GameRef): string | null {
  if (game.status !== "pending") return null;
  if (game.reported_side === "a") return game.profile_b;
  if (game.reported_side === "b") return game.profile_a;
  return null;
}

/**
 * Final games are visible to every logged-in player; anything else only to its two players and
 * admins. A player of the game acts as a player while it is pending (even an admin), so nobody
 * settles their own game alone; once final, admins may edit or void any game.
 */
export function gameRights(game: GameRef, viewer: Viewer): GameRights {
  const side = gameSide(game, viewer.id);
  const pending = game.status === "pending";
  const standalone = game.context !== "tournament";
  const adminActs = viewer.admin && standalone && (game.status === "finalized" || (pending && !side));
  return {
    canView: game.status === "finalized" || side !== null || viewer.admin,
    canRespond: standalone && pending && side !== null && side !== game.reported_side,
    canCancel: standalone && pending && side !== null && side === game.reported_side,
    canAdminEdit: adminActs,
    canVoid: adminActs,
  };
}
