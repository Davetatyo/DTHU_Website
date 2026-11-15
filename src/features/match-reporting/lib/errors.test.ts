import { describe, expect, it } from "vitest";
import { gameErrorMessage } from "./errors";

describe("gameErrorMessage", () => {
  it("maps function codes and constraint names", () => {
    expect(gameErrorMessage("report_changed")).toMatch(/frissítsd/);
    expect(gameErrorMessage('new row for relation "games" violates check constraint "games_winner_hp"')).toMatch(/0 életerővel/);
  });

  it("falls back to a generic text", () => {
    expect(gameErrorMessage("something else")).toBe("Nem sikerült menteni, próbáld újra.");
    expect(gameErrorMessage(null)).toBe("Nem sikerült menteni, próbáld újra.");
  });
});
