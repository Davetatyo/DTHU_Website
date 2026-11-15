import { describe, expect, it } from "vitest";
import { reminderLine, reportLine } from "./messages";

describe("reminderLine", () => {
  it("pings players who logged in with Discord", () => {
    expect(reminderLine({ name: "Feri", discordId: "123" }, "4 nap", "https://dthu.hu/x", false)).toBe(
      "⏳ <@123>, 4 nap maradt a játszma jóváhagyására: https://dthu.hu/x",
    );
  });

  it("bold name without a Discord id; the last call says so", () => {
    expect(reminderLine({ name: "Feri", discordId: null }, "24 óra", "u", true)).toBe("⏰ Utolsó szólás: **Feri**, 24 óra maradt a játszma jóváhagyására: u");
  });
});

describe("reportLine", () => {
  it("new report and correction", () => {
    expect(reportLine({ name: "Feri", discordId: "9" }, "Dave", "ranked", false, "u")).toBe(
      "🎲 <@9>, **Dave** beküldött egy ranked játszmát, nézd meg és hagyd jóvá: u",
    );
    expect(reportLine({ name: "Feri", discordId: null }, "Dave", "casual", true, "u")).toBe(
      "🎲 **Feri**, **Dave** kijavította a(z) casual játszmátok eredményét, nézd meg és hagyd jóvá: u",
    );
  });
});
