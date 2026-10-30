// The "DTHU párosítás-másoló" bookmarklet. It runs on karnyx.app, in the admin's own logged-in
// tab (a script on dthu.hu can't read Karnyx: no framing, same-origin policy). It reads the
// round's players from the page and copies them in the text format the Admin felület import
// already understands (lib/karnyx.ts in the match organizer): three "<Hero> Avatar" lines, then
// the nickname; neighbours are opponents.
//
// readKarnyxPlayers and toPasteText are inserted into the bookmarklet with Function#toString,
// so they must stay self-contained: no imports, no outside variables, plain ES2017 (no spread or
// for…of, which a compiler could turn into helper calls).

export type KarnyxPlayer = { name: string; heroes: string[] };

/**
 * Karnyx round page (checked 2026-10-30): each player row holds the hero avatars as
 * <img alt="Santa Avatar"> and the player link <a href="https://karnyx.app/players/…">Name</a>.
 * The row is the closest ancestor of the link that contains avatars; page order = pairing order.
 */
export function readKarnyxPlayers(root: ParentNode): KarnyxPlayer[] {
  const links = root.querySelectorAll('a[href*="/players/"]');
  const rows: Element[] = [];
  const players: KarnyxPlayer[] = [];
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    let row = link.parentElement;
    while (row && !row.querySelector('img[alt$=" Avatar"]')) row = row.parentElement;
    if (!row || rows.indexOf(row) >= 0) continue;
    // Climbed past the player's own row (e.g. a list of several players): not a pairing row.
    if (row.querySelectorAll('a[href*="/players/"]').length !== 1) continue;
    rows.push(row);
    const imgs = row.querySelectorAll('img[alt$=" Avatar"]');
    const heroes: string[] = [];
    for (let j = 0; j < imgs.length; j++) heroes.push((imgs[j].getAttribute("alt") || "").trim());
    const name = (link.textContent || "").replace(/\s+/g, " ").trim();
    if (name) players.push({ name: name, heroes: heroes });
  }
  return players;
}

/** The text the Admin felület import expects. */
export function toPasteText(players: KarnyxPlayer[]): string {
  const lines: string[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = 0; j < players[i].heroes.length; j++) lines.push(players[i].heroes[j]);
    lines.push(players[i].name);
  }
  return lines.join("\n");
}

/** What the bookmarklet does on the Karnyx page: read, copy, report. Self-contained, see above. */
function run(read: typeof readKarnyxPlayers, toText: typeof toPasteText) {
  const players = read(document);
  if (!players.length) {
    alert("DTHU: nem találtam játékosokat ezen az oldalon.\nNyisd meg a Karnyxban a verseny aktuális fordulójának párosításait, és ott kattints a könyvjelzőre.");
    return;
  }
  const text = toText(players);
  const pairs = Math.floor(players.length / 2);
  const msg = "DTHU: " + players.length + " játékos, " + pairs + " párosítás" + (players.length % 2 ? " + 1 páratlan" : "") + ".";
  function showBox() {
    const box = document.createElement("div");
    box.setAttribute("style", "position:fixed;inset:20px;z-index:2147483647;background:#16161d;color:#f1f0ec;border:2px solid #c89b3c;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;font:14px sans-serif");
    const p = document.createElement("div");
    p.textContent = msg + " Másold ki (Ctrl/Cmd+C), és illeszd be az Admin felületen az „Új forduló párosítása” mezőbe.";
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("style", "flex:1;background:#0c0c10;color:#f1f0ec;border:1px solid #272731;padding:8px;font:13px monospace");
    const b = document.createElement("button");
    b.textContent = "Bezárás";
    b.setAttribute("style", "align-self:flex-end;padding:6px 14px;background:#c89b3c;border:0;border-radius:6px;font-weight:700;cursor:pointer");
    b.onclick = function () {
      box.remove();
    };
    box.appendChild(p);
    box.appendChild(ta);
    box.appendChild(b);
    document.body.appendChild(box);
    ta.focus();
    ta.select();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      alert(msg + "\nA párosítások a vágólapon vannak: illeszd be az Admin felületen az „Új forduló párosítása” mezőbe, és nézd át az előnézetet.");
    }, showBox);
  } else {
    showBox();
  }
}

/** The bookmarklet URL (percent-encoded, so it survives being stored as a bookmark). */
export function bookmarkletHref(): string {
  const code = "(" + run.toString() + ")(" + readKarnyxPlayers.toString() + "," + toPasteText.toString() + ")";
  return "javascript:" + encodeURIComponent(code);
}
