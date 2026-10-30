// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { parseKarnyxPaste } from "@/features/match-organizer/lib/karnyx";
import { bookmarkletHref, readKarnyxPlayers } from "./bookmarklet";

// Markup modelled on the real Karnyx round page (row structure pasted by the owner 2026-10-30).
const av = (h: string) => `<div class="relative"><div data-flux-avatar><img src="x.webp" alt="${h} Avatar"></div></div>`;
const row = (name: string, heroes: string[]) =>
  `<div class="px-4 py-2 flex items-center justify-between"><div class="flex items-center gap-4"><div class="flex gap-1"><div class="flex isolate">${heroes
    .map(av)
    .join("")}</div></div><div class="flex flex-col"><a href="https://karnyx.app/players/${encodeURIComponent(name)}" data-flux-link>${name}</a></div></div><p data-flux-text>0</p></div>`;
const card = (...rows: string[]) => `<div class="match rounded-lg border divide-y">${rows.join("")}</div>`;

// Header: the signed-in user's "My Stats" link next to a strip of hero icons.
const HEADER = `<header><nav><div class="flex">${Array(18).fill("Barbarian").map(av).join("")}${av("Fell Summoner")}</div><a href="https://karnyx.app/players/dave-1">My Stats</a></nav></header>`;

const P = {
  eg: ["EngineerGnome", ["Santa", "Krampus", "Headless Horseman"]],
  ma: ["Malmos Andris", ["Spider-Man", "Black Widow", "Shadow Thief"]],
  lo: ["Lovinho", ["Black Widow", "Raveness", "Gambit"]],
  sa: ["Sandor", ["Monk", "Psylocke", "Pyromancer"]],
  bu: ["Burlogh", ["Barbarian", "Monk", "Ninja"]],
} as const;
const r = (k: keyof typeof P, reorder = false) => row(P[k][0], reorder ? [...P[k][1]].reverse() : [...P[k][1]]);

function page(html: string) {
  document.body.innerHTML = html;
  return readKarnyxPlayers(document);
}

describe("readKarnyxPlayers on the Karnyx round page", () => {
  it("skips the header strip and takes only the pairings, not the standings below", () => {
    const players = page(
      HEADER +
        `<section><h2>Pairings</h2><div class="space-y-4">${card(r("eg"), r("ma"))}${card(r("lo"), r("sa"))}</div></section>` +
        `<section><h2>Standings</h2><div class="divide-y">${r("sa", true)}${r("lo", true)}${r("eg", true)}${r("ma", true)}</div></section>`,
    );
    expect(players.map((p) => p.name)).toEqual(["EngineerGnome", "Malmos Andris", "Lovinho", "Sandor"]);
    expect(players[0].heroes).toEqual(["Santa Avatar", "Krampus Avatar", "Headless Horseman Avatar"]);
  });

  it("leaves out a Bye shown as a one-player box", () => {
    const players = page(`<div>${card(r("eg"), r("ma"))}${card(r("bu"))}${card(r("lo"), r("sa"))}</div>`);
    expect(players.map((p) => p.name)).toEqual(["EngineerGnome", "Malmos Andris", "Lovinho", "Sandor"]);
  });

  it("without match boxes, keeps the first appearance of each player", () => {
    const players = page(HEADER + `<div class="divide-y">${r("eg")}${r("ma")}${r("lo")}${r("sa")}</div><div>${r("sa", true)}${r("eg", true)}</div>`);
    expect(players.map((p) => p.name)).toEqual(["EngineerGnome", "Malmos Andris", "Lovinho", "Sandor"]);
    expect(players[3].heroes[0]).toBe("Monk Avatar");
  });

  it("finds nothing on a page without players", () => {
    expect(page(HEADER + "<main><p>Login</p></main>")).toEqual([]);
  });
});

describe("the bookmark itself", () => {
  it("copies importable pairings from the page", async () => {
    document.body.innerHTML =
      HEADER +
      `<div>${card(r("eg"), r("ma"))}${card(r("lo"), r("sa"))}</div><div class="divide-y">${r("sa", true)}${r("lo", true)}${r("eg", true)}${r("ma", true)}</div>`;
    let copied = "";
    let message = "";
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => void (copied = t) } });
    window.alert = (m?: unknown) => void (message = String(m));
    new Function(decodeURIComponent(bookmarkletHref().slice("javascript:".length)))();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const parsed = parseKarnyxPaste(copied);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.pairings.map((p) => `${p.a.name} vs ${p.b?.name}`)).toEqual(["EngineerGnome vs Malmos Andris", "Lovinho vs Sandor"]);
    expect(message).toContain("4 játékos, 2 párosítás");
  });
});
