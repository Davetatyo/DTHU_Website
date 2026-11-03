// Badge rings around the profile picture (roadmap R3/R4: podium sets and level badges). Pure
// and browser-safe. The art lives in public/badges/; each PNG has a transparent round hole
// where the picture goes, and the hole size differs per drawing, so a badge is always sized
// from the picture (badgeBoxSize), never the other way round. Details:
// docs/mockups/podium-badges/README.md.

export type BadgeTier = "gold" | "silver" | "bronze";

export type Badge = {
  /** Stable id, e.g. "vitality-gold" or "level-barbarian" (stored in the test cookie). */
  id: string;
  /** Hungarian name shown on the site. */
  name: string;
  group: "podium" | "level";
  /** Podium badges: the set and the place. */
  set?: string;
  tier?: BadgeTier;
  /** Level badges: the XP level that awards it. */
  level?: number;
  /** Large (512 px) and small header (128 px) files. */
  src: string;
  srcSmall: string;
  /** Hole radius as a share of the image width, for each file. */
  hole: number;
  holeSmall: number;
};

const TIER_NAMES: Record<BadgeTier, string> = { gold: "arany", silver: "ezüst", bronze: "bronz" };
const TIER_PLACES: Record<BadgeTier, number> = { gold: 1, silver: 2, bronze: 3 };

/** Podium sets: folder, display name, hole radius in the 512 and 128 px files. */
export const BADGE_SETS = [
  { folder: "vitality", name: "Vitality", hole: 139.8, holeSmall: 30.4 },
  { folder: "innovation", name: "Innovation", hole: 104.02, holeSmall: 25.94 },
  { folder: "devotion", name: "Devotion", hole: 121.02, holeSmall: 32.76 },
  { folder: "mad-king", name: "Mad King", hole: 121.47, holeSmall: 34.21 },
  { folder: "x-mas", name: "X-Mas", hole: 108.58, holeSmall: 27.5 },
  { folder: "parbaj", name: "Párbaj", hole: 108.31, holeSmall: 34.21 },
] as const;

/** Single badges awarded at an XP level. */
export const LEVEL_BADGES = [
  { file: "barbarian", name: "Barbár", level: 5, hole: 103.65, holeSmall: 28.61 },
  { file: "moon-elf", name: "Holdtünde", level: 7, hole: 103.02, holeSmall: 26.18 },
] as const;

const TIERS: BadgeTier[] = ["gold", "silver", "bronze"];

export const BADGES: Badge[] = [
  ...LEVEL_BADGES.map(
    (b): Badge => ({
      id: `level-${b.file}`,
      name: b.name,
      group: "level",
      level: b.level,
      src: `/badges/levels/${b.file}-512.png`,
      srcSmall: `/badges/levels/${b.file}-128.png`,
      hole: b.hole / 512,
      holeSmall: b.holeSmall / 128,
    }),
  ),
  ...BADGE_SETS.flatMap((s) =>
    TIERS.map(
      (tier): Badge => ({
        id: `${s.folder}-${tier}`,
        name: `${s.name} · ${TIER_NAMES[tier]}`,
        group: "podium",
        set: s.name,
        tier,
        src: `/badges/${s.folder}/${tier}-512.png`,
        srcSmall: `/badges/${s.folder}/${tier}-128.png`,
        hole: s.hole / 512,
        holeSmall: s.holeSmall / 128,
      }),
    ),
  ),
];

const byId = new Map(BADGES.map((b) => [b.id, b]));

/** The badge with this id, or null (unknown ids, e.g. from an old cookie, are ignored). */
export function findBadge(id: string | null | undefined): Badge | null {
  return (id && byId.get(id)) || null;
}

/** "1. hely" style label of a podium badge's place. */
export function tierPlace(tier: BadgeTier): string {
  return `${TIER_PLACES[tier]}. hely`;
}

/** Size of the badge image (px) that fits a profile picture of `picture` px into its hole. */
export function badgeBoxSize(picture: number, hole: number): number {
  return Math.round(picture / (2 * hole));
}
