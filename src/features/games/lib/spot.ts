// Szemfüles: spot the differences. Pure functions and the pictures' data, unit-tested.
// Owner decisions (2026-11-03): +10 for a difference found, −5 for a wrong tap, the score never
// goes below 0; 60 seconds; titles by share of the maximum: 100% Szemfüles, 80% Sasszem,
// 60% Ügyeske, otherwise a simple congratulation. New pictures: the owner sends two images,
// the differences are marked here.

export type Spot = {
  /** Centre, as a share of the picture's width and height (0–1). */
  x: number;
  y: number;
  /** Radius, as a share of the picture's width. */
  r: number;
  /** What changed (shown when the round is over). */
  label: string;
};

export type SpotPicture = {
  id: string;
  name: string;
  /** The two versions (public/jatekok/szemfules/). */
  images: [string, string];
  /** Width / height of the pictures. */
  ratio: number;
  spots: Spot[];
};

const px = (x: number, y: number, r: number, label: string, w = 2000, h = 1116): Spot => ({ x: x / w, y: y / h, r: r / w, label });

export const PICTURES: SpotPicture[] = [
  {
    id: "tea-party",
    name: "Tea Party",
    images: ["/jatekok/szemfules/tea-party-1.jpg", "/jatekok/szemfules/tea-party-2.jpg"],
    ratio: 2000 / 1116,
    // Marked on the 2000 × 1116 originals; confirmed with the owner (2026-11-03).
    spots: [
      px(1590, 130, 60, "Holdsarló az égen"),
      px(1930, 235, 60, "Lámpás vagy tündér a vérfarkas kezében"),
      px(487, 633, 45, "Holdmedál vagy zöld drágakő"),
      px(810, 795, 55, "Tortaszelet a tányéron"),
      px(1015, 795, 55, "Homokóra vagy sószóró"),
      px(955, 655, 45, "Égő vagy kialudt gyertya"),
      px(1475, 605, 60, "Szív vagy levél a Lovas mellkasán"),
      px(1065, 1040, 75, "Manó az asztal alatt"),
      px(1713, 561, 85, "Csorba vagy ép fejszeél"),
      px(318, 440, 55, "Merre néz a holló"),
    ],
  },
  {
    id: "trick-or-treat",
    name: "Trick or Treat",
    images: ["/jatekok/szemfules/trick-or-treat-1.jpg", "/jatekok/szemfules/trick-or-treat-2.jpg"],
    ratio: 2000 / 1116,
    // The owner marked the 10 (2026-11-03). The generator also changed a few things by accident
    // (a lit window, pumpkin faces): the second image is the first one with only these 10
    // areas taken from the owner's version, so nothing else differs.
    spots: [
      px(490, 190, 90, "Széttárt szárnyú vagy károgó holló"),
      px(292, 150, 70, "Boszorkánysüveg vagy szalmakalap a madárijesztőn"),
      px(150, 480, 50, "Fekete macska a kerítésen"),
      px(712, 756, 65, "Zombikéz vagy bekötözött múmiakéz"),
      px(855, 625, 60, "Sötét vagy világító kis tök a lépcsőnél"),
      px(1132, 82, 45, "Gyertya a padlásablakban"),
      px(1420, 70, 60, "Pók a tetőn"),
      px(1275, 985, 115, "Csordultig tele cukorkás tök"),
      px(1700, 915, 70, "Tökfej vagy szellem a zacskón"),
      px(1784, 694, 65, "Nyalóka vagy csoki a kézben"),
    ],
  },
  {
    id: "black-friday",
    name: "Black Friday Shopping",
    images: ["/jatekok/szemfules/black-friday-1.jpg", "/jatekok/szemfules/black-friday-2.jpg"],
    ratio: 2000 / 1116,
    // The pair had 11 differences; the owner dropped the small second "MEGA DEALS" sign
    // (2026-11-03). Picture 2 is picture 1 plus only these 10 areas, as for Trick or Treat.
    spots: [
      px(145, 610, 130, "Hősök vagy lila sárkány a reklámtáblán"),
      px(1024, 184, 150, "A kiállítás táblájának színe"),
      px(1516, 138, 50, "Dobókocka a zászlón"),
      px(1712, 284, 80, "BIG SALE vagy MEGA DEALS felirat"),
      px(360, 362, 60, "Sárga sapka az árusón"),
      px(342, 596, 50, "50%-os kedvezmény tábla"),
      px(802, 668, 100, "Mystical Dragon doboz a kupacban"),
      px(1404, 866, 105, "Barna vagy kék SALE szatyor"),
      px(1600, 600, 100, "Barna vagy zöld ruha a barbáron"),
      px(1876, 1015, 115, "Sárkány a sarokban álló dobozon"),
    ],
  },
  {
    id: "arrr",
    name: "ARRRrrrrrrrrr",
    images: ["/jatekok/szemfules/arrr-1.jpg", "/jatekok/szemfules/arrr-2.jpg"],
    ratio: 2000 / 1116,
    // Found by the difference map (2026-11-03); picture 2 is picture 1 plus only these areas.
    spots: [
      px(1340, 45, 140, "Koponya és keresztcsontok a vitorlán"),
      px(512, 234, 115, "Második majom a kötélen"),
      px(316, 398, 105, "Hajó a láthatáron"),
      px(705, 285, 75, "Barna vagy kék kalap a kapitányon"),
      px(580, 690, 50, "Koponya a kormánykeréken"),
      px(95, 705, 90, "Hordó vagy kincsesláda"),
      px(265, 825, 90, "Vödör a korláton"),
      px(1098, 512, 55, "Kendő a tökfejen"),
      px(1250, 744, 160, "Felmosó vagy súrolókefe"),
      px(1585, 975, 105, "Ágyúk a hajó oldalán"),
    ],
  },
];

export const ROUND_SECONDS = 60;
export const HIT = 10;
export const MISS = -5;
/** Taps a little outside the circle still count (fair on small phone pictures). */
const TOLERANCE = 1.3;
/** The smallest target, as a share of the picture's width (a fingertip on a phone). */
const MIN_RADIUS = 0.035;

/**
 * Which difference a tap hits (x, y as shares of the picture's width and height), or null.
 * Differences already found don't count again.
 */
export function hitSpot(picture: SpotPicture, found: ReadonlySet<number>, x: number, y: number): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  picture.spots.forEach((s, i) => {
    if (found.has(i)) return;
    // Distance in units of the picture's width (y is scaled back by the aspect ratio).
    const d = Math.hypot(x - s.x, (y - s.y) / picture.ratio);
    if (d <= Math.max(s.r, MIN_RADIUS) * TOLERANCE && d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/** Whether a tap is on a difference that's already found (no points, no penalty). */
export function onFoundSpot(picture: SpotPicture, found: ReadonlySet<number>, x: number, y: number): boolean {
  return [...found].some((i) => {
    const s = picture.spots[i];
    return Math.hypot(x - s.x, (y - s.y) / picture.ratio) <= Math.max(s.r, MIN_RADIUS) * TOLERANCE;
  });
}

/** The score after a tap; never below 0. */
export const addScore = (score: number, hit: boolean) => Math.max(0, score + (hit ? HIT : MISS));

export const maxScore = (picture: SpotPicture) => picture.spots.length * HIT;

/** The title for a final score. */
export function title(score: number, max: number): { name: string; text: string } {
  const share = max ? score / max : 0;
  if (share >= 1) return { name: "Szemfüles!", text: "Mind a tízet megtaláltad, egyetlen hiba nélkül. Semmi sem kerüli el a figyelmedet!" };
  if (share >= 0.8) return { name: "Sasszem", text: "Majdnem minden különbséget kiszúrtál. Éles szem, gyors kéz!" };
  if (share >= 0.6) return { name: "Ügyeske", text: "Szép munka! Még egy kis gyakorlás, és sasszem leszel." };
  return { name: "Gratulálunk!", text: "Végigcsináltad! Nézd meg, mi maradt rejtve, és próbáld újra." };
}
