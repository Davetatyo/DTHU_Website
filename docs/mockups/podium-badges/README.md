# Badges: podium sets (gold, silver, bronze) and level badges

Tournament podium badge rings: 1st place gold, 2nd silver, 3rd bronze. They come in **sets**
(owner, 2026-11-03), each with its own look. Drawn by another agent from the owner's
prompts; each set arrived as one preview image and was cut out here. Not built into the site
yet: the files wait in `public/badges/<set>/` for the XP and Gyűjtemény work (roadmap R3,
R4).

| Set | Look | Files |
|---|---|---|
| **Vitality** | "storm grove": moss, thorny vines, carved bark, a glowing seed gem on top, a numeral medallion at the bottom | `public/badges/vitality/` |
| **Innovation** | steampunk: riveted metal ring, glowing energy tubes and wires, gears, a glowing lens on top, a gear medallion with the numeral, electric sparks | `public/badges/innovation/` |
| **Devotion** | knightly: polished metal ring with scrolls, red cloth sashes, a winged shield with a gem on top, a shield with the numeral at the bottom, sparkles | `public/badges/devotion/` |
| **Mad King** | barbaric: horned crest with a glowing crystal, armour plates with straps and spikes, glowing runes, a torn red cloth, a shield with the numeral | `public/badges/mad-king/` |
| **X-Mas** | festive: snow-capped ring with red ribbons and a bow, holly, a star on top, a shield with the numeral, snowflakes | `public/badges/x-mas/` |
| **Párbaj** | duel / Wild West: a cowboy hat with a glowing die (gold), crystal cube (silver) or crystals (bronze), bandoliers and purple scarves, gems, a gear medallion, energy arcs | `public/badges/parbaj/` |

## Level badges (single badges, not sets)

Earned by reaching an XP level (owner, 2026-11-03), one badge each, no gold/silver/bronze:

| Badge | Level | Look | Files | 512 hole | 128 hole |
|---|---|---|---|---|---|
| **Barbarian** (Barbár) | 5 | bronze-toned riveted ring, fur, straps, a glowing amber orb on top, a plain shield at the bottom, embers | `public/badges/levels/barbarian-{512,128}.png` | 103.65 px | 28.61 px |
| **Moon Elf** (Holdtünde) | 7 | silver ring with flowing cloth, a glowing crescent moon on top, a winged shield, blue sparkles | `public/badges/levels/moon-elf-{512,128}.png` | 103.02 px | 26.18 px |

Placed the same way as the podium badges (see below). Screenshots:
`szint-jelvenyek-sotet-vilagos.png`, `gyujtemeny-szint-jutalmak.jpg` (Gyűjtemény row: earned
and locked). Moon Elf shows a small dark patch beside the moon on white backgrounds (part of
its glow); fine on the dark header.

## Files

Each set has `{gold,silver,bronze}-512.png` (profile page, Gyűjtemény cards, level-up popup)
and `{gold,silver,bronze}-128.png` (a simplified drawing for the header chip). All are
transparent PNGs with an exact transparent hole for the profile picture. The hole size
differs per set, because the ornaments reach out differently:

| Set | 512 file: hole radius | 128 file: hole radius |
|---|---|---|
| Vitality | 139.8 px (27.3% of the width) | 30.4 px (23.75%) |
| Innovation | 104.0 px (20.3%) | 25.9 px (20.3%) |
| Devotion | 121.0 px (23.6%) | 32.8 px (25.6%) |
| Mad King | 121.5 px (23.7%) | 34.2 px (26.7%) |
| X-Mas | 108.6 px (21.2%) | 27.5 px (21.5%) |
| Párbaj | 108.3 px (21.2%) | 34.2 px (26.7%) |

**How to place one:** pick the profile picture's size first, then size the badge from it, so
every set shows the picture at the same size:
`badgeSize = pictureDiameter / (2 × hole / width)`. Draw the picture as a circle centred in
the badge (1 px larger, so no seam shows), then the PNG on top. Ornaments may overlap the
picture's edge on purpose. Examples used in the screenshots: picture 52 px in the Gyűjtemény
cards (Vitality badge 95 px, Innovation 128 px, Devotion 110 px); about 17 px in the header
chip. Give the cards a fixed text/button area so different badge heights don't misalign them.

## How the files were made

`cut-vitality.py.txt`, `cut-innovation.py.txt` and `cut-devotion.py.txt` (Python + Pillow,
renamed so nothing runs them). Devotion needed two extras: its dim gold halo is keyed (so it
is see-through on white, not a brown rim) while the deep red sashes always stay solid.
`cut-mad-king-x-mas.py.txt` takes the settings per set (also used for Párbaj, whose small
versions sat on black squares and were keyed against black). Mad King: the preview had a dark red
swirl inside the ring around a small grey picture; the hole goes to the ring's inner edge
(like every other set), so the swirl is removed and the picture fills the ring. Its dark
metal needs the plain colour-distance background test, or the plates turn into holes; the
same goes for Párbaj's dark leather bandoliers. The badges sat on a dark background in one 2000 × 1116 preview per set. The script
keeps the solid badge, keys the glow, lightning and sparks against the background (only light
pixels survive, so nothing smudges on the white profile card), fades sparks at the edge, and
cuts the hole exactly where the stand-in grey picture was. A source badge was about 600 px
wide, so 512 px is the honest resolution.

## Screenshots (scratch copy, example data)

- `vitality-sotet-vilagos.png`, `innovation-sotet-vilagos.png`: the cut-outs on dark and white
- `vitality-profil.jpg`, `vitality-profil-telefon-vilagos.jpg`, `vitality-fejlec.png`
- `innovation-profil.jpg`, `innovation-fejlec.png`
- `devotion-sotet-vilagos.png`, `devotion-profil.jpg`, `devotion-fejlec.png`
- `mad-king-sotet-vilagos.png`, `x-mas-sotet-vilagos.png`, `parbaj-sotet-vilagos.png`: the
  cut-outs on dark and white; `parbaj-profil.jpg`, `parbaj-fejlec.png` (worn)
- `gyujtemeny-harom-keszlet.jpg`: the Gyűjtemény with three sets and the admin
  "mind kipróbálható" tag; `gyujtemeny-ot-keszlet.jpg`: Devotion, Mad King and X-Mas rows
