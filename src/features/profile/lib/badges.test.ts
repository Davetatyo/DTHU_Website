import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BADGE_SETS, BADGES, LEVEL_BADGES, badgeBoxSize, findBadge, tierPlace } from "./badges";

describe("badge catalogue", () => {
  it("has every podium set in three places plus the level badges, with unique ids", () => {
    expect(BADGES).toHaveLength(BADGE_SETS.length * 3 + LEVEL_BADGES.length);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  it("points at files that exist in public/", () => {
    for (const b of BADGES) {
      expect(existsSync(join(process.cwd(), "public", b.src)), b.src).toBe(true);
      expect(existsSync(join(process.cwd(), "public", b.srcSmall)), b.srcSmall).toBe(true);
    }
  });

  it("has plausible hole sizes (a share of the image width)", () => {
    for (const b of BADGES) {
      expect(b.hole).toBeGreaterThan(0.15);
      expect(b.hole).toBeLessThan(0.35);
      expect(b.holeSmall).toBeGreaterThan(0.15);
      expect(b.holeSmall).toBeLessThan(0.35);
    }
  });
});

describe("findBadge", () => {
  it("finds known ids and ignores anything else", () => {
    expect(findBadge("vitality-gold")?.name).toBe("Vitality · arany");
    expect(findBadge("level-barbarian")?.level).toBe(5);
    expect(findBadge("nope")).toBeNull();
    expect(findBadge("")).toBeNull();
    expect(findBadge(undefined)).toBeNull();
  });
});

describe("sizes", () => {
  it("sizes the badge so the picture fills the hole", () => {
    // hole radius 25% of the width: a 50 px picture needs a 100 px badge
    expect(badgeBoxSize(50, 0.25)).toBe(100);
    const b = findBadge("innovation-gold")!;
    expect(badgeBoxSize(52, b.hole)).toBe(128);
  });

  it("labels the places", () => {
    expect(tierPlace("gold")).toBe("1. hely");
    expect(tierPlace("bronze")).toBe("3. hely");
  });
});
