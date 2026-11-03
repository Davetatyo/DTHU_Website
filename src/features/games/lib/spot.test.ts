import { describe, expect, it } from "vitest";
import { addScore, hitSpot, maxScore, onFoundSpot, PICTURES, title } from "./spot";

const tea = PICTURES[0];

describe("Szemfüles pictures", () => {
  it("has unique ids", () => {
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length);
  });

  it.each(PICTURES.map((p) => [p.name, p] as const))("%s has 10 differences inside the picture, not overlapping", (_, pic) => {
    expect(pic.spots).toHaveLength(10);
    for (const s of pic.spots) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(1);
    }
    pic.spots.forEach((a, i) =>
      pic.spots.forEach((b, j) => {
        if (i < j) expect(Math.hypot(a.x - b.x, (a.y - b.y) / pic.ratio), `${a.label} / ${b.label}`).toBeGreaterThan(a.r + b.r);
      }),
    );
    // Every difference is hit at its own centre (no neighbour steals the tap).
    pic.spots.forEach((s, i) => expect(hitSpot(pic, new Set(), s.x, s.y)).toBe(i));
  });
});

describe("taps", () => {
  it("hits each difference at its centre and a little outside its circle", () => {
    tea.spots.forEach((s, i) => {
      expect(hitSpot(tea, new Set(), s.x, s.y)).toBe(i);
      expect(hitSpot(tea, new Set(), s.x + s.r * 1.2, s.y)).toBe(i);
    });
  });

  it("misses empty places, and doesn't count a found difference twice", () => {
    expect(hitSpot(tea, new Set(), 0.33, 0.12)).toBeNull(); // the full moon
    expect(hitSpot(tea, new Set([0]), tea.spots[0].x, tea.spots[0].y)).toBeNull();
    expect(onFoundSpot(tea, new Set([0]), tea.spots[0].x, tea.spots[0].y)).toBe(true);
  });
});

describe("score", () => {
  it("adds 10, takes 5, never goes below 0", () => {
    expect(addScore(0, true)).toBe(10);
    expect(addScore(10, false)).toBe(5);
    expect(addScore(0, false)).toBe(0);
    expect(maxScore(tea)).toBe(100);
  });

  it("gives the titles by share of the maximum", () => {
    expect(title(100, 100).name).toBe("Szemfüles!");
    expect(title(85, 100).name).toBe("Sasszem");
    expect(title(80, 100).name).toBe("Sasszem");
    expect(title(60, 100).name).toBe("Ügyeske");
    expect(title(55, 100).name).toBe("Gratulálunk!");
  });
});
