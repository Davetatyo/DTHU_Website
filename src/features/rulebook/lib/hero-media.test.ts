import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HERO_MEDIA } from "../data/hero-media";
import { renderEntry } from "./content";
import { mediaLabel, mediaSrc, mediaThumbSrc, splitHeroBody } from "./hero-media";

const heroes = readdirSync(join(process.cwd(), "src/features/rulebook/content/hero")).map((f) => f.slice(0, -5));
const inPublic = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("hero media list", () => {
  it("only lists heroes that exist", () => {
    expect(Object.keys(HERO_MEDIA).filter((id) => !heroes.includes(id))).toEqual([]);
  });

  it("has a picture and a thumbnail for every item", () => {
    for (const items of Object.values(HERO_MEDIA)) {
      for (const item of items) {
        expect(inPublic(mediaSrc(item)), item.file).toBe(true);
        expect(inPublic(mediaThumbSrc(item)), item.file).toBe(true);
      }
    }
  });

  it("gives every hero a board and a leaflet", () => {
    for (const [id, items] of Object.entries(HERO_MEDIA)) {
      expect(items.some((i) => i.kind === "board"), id).toBe(true);
      expect(items.some((i) => i.kind === "leaflet"), id).toBe(true);
    }
  });

  it("names each one apart when a hero has two of a kind", () => {
    for (const [id, items] of Object.entries(HERO_MEDIA)) {
      const labels = items.map(mediaLabel);
      expect(new Set(labels).size, id).toBe(labels.length);
    }
  });

  it("only leaves out the heroes we know have no pictures yet", () => {
    expect(heroes.filter((id) => !HERO_MEDIA[id])).toEqual(["mystic-brawler"]);
  });
});

describe("mediaLabel", () => {
  it("uses the Szabálytár's names", () => {
    expect(mediaLabel({ kind: "board", label: null })).toBe("Hős tábla");
    expect(mediaLabel({ kind: "leaflet", label: null })).toBe("Hős kiskönyv");
    expect(mediaLabel({ kind: "board", label: "Sötét Főnix" })).toBe("Hős tábla · Sötét Főnix");
  });
});

describe("splitHeroBody", () => {
  it("splits before the first heading", () => {
    expect(splitHeroBody("<p>bio</p><h3>Tokenek</h3><h3>Más</h3>")).toEqual(["<p>bio</p>", "<h3>Tokenek</h3><h3>Más</h3>"]);
  });

  it("keeps everything on top when there is no heading", () => {
    expect(splitHeroBody("<p>bio</p>")).toEqual(["<p>bio</p>", ""]);
  });
});

describe("renderEntry", () => {
  it("adds the media to heroes only", () => {
    expect(renderEntry({ kind: "hero", id: "barbarian" }).media).toEqual(HERO_MEDIA.barbarian);
    expect(renderEntry({ kind: "hero", id: "mystic-brawler" }).media).toEqual([]);
    expect(renderEntry({ kind: "token", id: "stun" }).media).toEqual([]);
  });
});
