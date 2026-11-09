"""Copies the Taktikai feladvány images from the Dice_Throne_Card_Scanner repo (read-only) into
public/jatekok/feladvany/: card images as webp, one picture per die face and the hero boards.

Run from the DTHU repo root:  python3 -I scripts/puzzle/assets.py <path to Dice_Throne_Card_Scanner>
"""
import sys
from pathlib import Path
from PIL import Image

scanner = Path(sys.argv[1])
out = Path("public/jatekok/feladvany")
(out / "cards").mkdir(parents=True, exist_ok=True)
(out / "dice").mkdir(parents=True, exist_ok=True)
(out / "boards").mkdir(parents=True, exist_ok=True)

# Cards: the common deck and the Season 1 heroes the engine knows.
for pack in ["base", "S1/barbarian", "S1/moon-elf"]:
    for card in sorted((scanner / "data/cards" / pack).iterdir()):
        src = card / "digital.png"
        if not src.exists():
            continue
        im = Image.open(src).convert("RGB")
        im = im.resize((420, round(im.height * 420 / im.width)), Image.LANCZOS)
        im.save(out / "cards" / f"{card.name}.webp", "WEBP", quality=82, method=6)

# Dice: the net image has two rows of three faces in its lower two thirds:
# top row 2, 4, 5 and bottom row 1, 3, 6 (same layout for every Season 1 hero). Faces 1 and 6
# are printed upside down in the net, so they are turned.
LAYOUT = [[2, 4, 5], [1, 3, 6]]
for hero, file in [("barbarian", "Barbarian/Barbarian - Dice.png"), ("moon-elf", "Moon Elf/Moon Elf - Dice.png")]:
    im = Image.open(scanner / "sources/S1" / file).convert("RGB")
    w, h = im.size
    cw, ch = w / 3, h / 3
    for r, row in enumerate(LAYOUT):
        for c, value in enumerate(row):
            box = (round(c * cw), round((r + 1) * ch), round((c + 1) * cw), round((r + 2) * ch))
            face = im.crop(box).resize((160, 160), Image.LANCZOS)
            if value in (1, 6):
                face = face.rotate(180)
            face.save(out / "dice" / f"{hero}-{value}.webp", "WEBP", quality=85, method=6)
# Original Season 1 hero boards, shown in the puzzle's "Hőstábla" popup.
for hero, file in [("barbarian", "Barbarian/Barbarian - Board.png"), ("moon-elf", "Moon Elf/Moon Elf - Board.png")]:
    im = Image.open(scanner / "sources/S1" / file).convert("RGBA")
    bg = Image.new("RGBA", im.size, (0, 0, 0, 0))
    im = Image.alpha_composite(bg, im)
    im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(out / "boards" / f"{hero}.webp", "WEBP", quality=80, method=6)

print("done")
