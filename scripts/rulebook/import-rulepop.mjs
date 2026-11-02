// One-off import of the Hungarian RulePop site (https://dice-throne-rulepop-hu.vercel.app/,
// made by the owner) into the Szabálytár. Run once: `node scripts/rulebook/import-rulepop.mjs`.
//
// After the import the repository is the only source: content is edited in
// src/features/rulebook/content/. The script refuses to overwrite existing content unless
// --force is given, because that would throw away every edit and translation made since.
//
// What it does:
// - splits the site's sections (<rp-modal>) and its hero/token pages into one HTML file each,
//   keeping RulePop's markup and its "#id" links (lib/content.ts turns them into our URLs);
// - leaves out Adventures and Marvel co-op content (owner decision, 2026-11-03), the settings,
//   search, install and update-check parts (our site has its own); after the import the
//   "Boss tábla" see-also link of ultimate-ability was removed by hand (Adventures);
// - turns RulePop's custom elements into plain HTML (classes styled in rulepop.css);
// - downloads the pictures and the icon sprite sheet into public/szabalytar/.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SITE = "https://dice-throne-rulepop-hu.vercel.app";
const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const CONTENT = join(ROOT, "src/features/rulebook/content");
const PUBLIC = join(ROOT, "public/szabalytar");
const IMG_URL = "/szabalytar/img/";

/** Sections we don't import: our site has its own settings, search and no install/update. */
const SKIP_SECTIONS = new Set(["install-pwa", "settings", "find"]);
/** Game-variant flags of Adventures (dta) and Marvel co-op (dtm): left out. */
const DROP_FLAGS = new Set(["g-dta", "g-dtm", "faq-dta"]);
const VOID = new Set(["img", "input", "br", "hr", "source", "use", "path", "meta", "link"]);

if (existsSync(join(CONTENT, "rules")) && !process.argv.includes("--force")) {
  console.error("Content already imported. Re-running overwrites every edit; pass --force if you really mean it.");
  process.exit(1);
}

async function get(path, binary = false) {
  const res = await fetch(SITE + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

/** End index (exclusive) of the element whose start tag begins at `start`. */
function elementEnd(html, start) {
  const open = /^<([a-zA-Z][\w-]*)[^>]*?(\/?)>/.exec(html.slice(start));
  if (!open) throw new Error(`No start tag at ${start}`);
  const name = open[1].toLowerCase();
  let i = start + open[0].length;
  if (open[2] === "/" || VOID.has(name)) return i;
  const re = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, "gi");
  re.lastIndex = i;
  let depth = 1;
  for (let m; (m = re.exec(html)); ) {
    if (m[1]) depth--;
    else if (!m[2]) depth++;
    if (depth === 0) return m.index + m[0].length;
  }
  throw new Error(`Unclosed <${name}> at ${start}`);
}

/** Removes Adventures/Marvel-only elements and drops those flags from mixed expressions. */
function dropVariants(html) {
  for (;;) {
    let changed = false;
    const re = /<[a-zA-Z][\w-]*\b[^>]*?\sdata-relevance="([^"]*)"[^>]*>/g;
    for (let m; (m = re.exec(html)); ) {
      const terms = m[1].split("||").map((t) => t.trim());
      if (!terms.some((t) => DROP_FLAGS.has(t))) continue;
      if (/&&|!|\band\b|\bnot\b/.test(m[1])) throw new Error(`Unexpected relevance: ${m[1]}`);
      const kept = terms.filter((t) => !DROP_FLAGS.has(t));
      if (kept.length === 0) {
        html = html.slice(0, m.index) + html.slice(elementEnd(html, m.index));
      } else {
        const tag = m[0].replace(`data-relevance="${m[1]}"`, `data-relevance="${kept.join(" || ")}"`);
        html = html.slice(0, m.index) + tag + html.slice(m.index + m[0].length);
      }
      changed = true;
      break;
    }
    if (!changed) return html;
  }
}

/** Removes the first element matching `startRe` (a regex for its start tag). */
function removeElement(html, startRe) {
  const m = startRe.exec(html);
  return m ? html.slice(0, m.index) + html.slice(elementEnd(html, m.index)) : html;
}

const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** RulePop's custom elements (rp-composite, rp-float, rp-img-detail) as plain divs. */
function plainElements(html) {
  html = html.replace(/<rp-composite\b([^>]*)>/g, (_, a) => {
    const cls = ["rp-composite", attr(a, "class"), attr(a, "slot") === "float" && "rp-float-side"].filter(Boolean).join(" ");
    return `<div class="${cls}" style="aspect-ratio:${attr(a, "aspect-ratio") ?? "1/1"}">`;
  });
  html = html.replace(/<rp-img-detail\b([^>]*)>\s*<\/rp-img-detail>/g, (_, a) => {
    const style = [
      `background-image:url('${attr(a, "src")}')`,
      `background-size:${attr(a, "zoom") ?? "100%"}`,
      `background-position:${attr(a, "left") ?? "0"} ${attr(a, "top") ?? "0"}`,
      `aspect-ratio:${attr(a, "aspect-ratio") ?? "1/1"}`,
    ].join(";");
    return `<div class="rp-img-detail ${attr(a, "class") ?? ""}" style="${style}"></div>`;
  });
  html = html.replace(/<rp-float\b([^>]*)>/g, (_, a) => {
    if (attr(a, "breakpoint") !== "400px" || attr(a, "stack") !== "last" || attr(a, "float") !== "right") {
      throw new Error(`rp-float variant not supported: ${a}`);
    }
    return `<div class="rp-float" style="--float-w:${attr(a, "float-width")};--float-max:${attr(a, "float-max-width")}">`;
  });
  html = html.replace(/<\/(rp-composite|rp-float)>/g, "</div>");
  // Other elements in a float slot: <img slot="float" class="x"> -> class="x rp-float-side"
  html = html.replace(/<(\w+)([^>]*?)\sslot="float"([^>]*)>/g, (_, tag, a, b) => {
    const all = a + b;
    const cls = attr(all, "class");
    const rest = all.replace(/\sclass="[^"]*"/, "");
    return `<${tag} class="${cls ? cls + " " : ""}rp-float-side"${rest}>`;
  });
  if (/<rp-(?!modal)/.test(html)) throw new Error("Unconverted rp- element left");
  return html;
}

/** Collects picture paths, rewrites them to /szabalytar/img/..., returns the new HTML. */
function localImages(html, images) {
  const local = (p) => {
    const norm = p.replace(/^\.?\//, "").replace(/^assets\//, "");
    images.add(norm);
    return IMG_URL + norm;
  };
  html = html.replace(/(<img\b[^>]*\ssrc=")([^"]+)"/g, (_, pre, p) => `${pre}${p.startsWith("data:") ? p : local(p)}"`);
  html = html.replace(/url\('([^']+)'\)/g, (_, p) => `url('${local(p)}')`);
  return html;
}

function clean(html, images) {
  if (/<script|\son[a-z]+=/i.test(html)) throw new Error("Script or event handler in content");
  return localImages(plainElements(dropVariants(html)), images).replace(/[ \t]+\n/g, "\n").trim() + "\n";
}

const index = await get("/");
const images = new Set();
const written = [];
let imported = ""; // the imported sections: hero/token pages are taken only if listed there

mkdirSync(join(CONTENT, "rules"), { recursive: true });
for (const m of index.matchAll(/<rp-modal\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/rp-modal>/g)) {
  const [, id, attrs, body] = m;
  if (SKIP_SECTIONS.has(id)) continue;
  let html = body;
  if (id === "about") {
    html = removeElement(html, /<button id="check-for-update"/);
    html = removeElement(html, /<dl class="grid">\s*<dt>Legutóbb/);
  }
  if (id === "faq") html = removeElement(html, /<li><label><input name="dice-throne-faq" type="radio" value="faq-dta"/);
  html = clean(html, images);
  imported += html;
  writeFileSync(join(CONTENT, "rules", `${id}.html`), html);
  written.push(`${id}\t${attrs.trim()}`);
}

for (const kind of ["hero", "token"]) {
  mkdirSync(join(CONTENT, kind), { recursive: true });
  // Tokens listed only for Adventures/Marvel co-op dropped out of the lists above: not imported.
  const ids = [...new Set([...imported.matchAll(new RegExp(`href="#${kind}/([^"]+)"`, "g"))].map((m) => m[1]))];
  for (const id of ids) {
    writeFileSync(join(CONTENT, kind, `${id}.html`), clean(await get(`/partials/${kind}/${id}.html`), images));
  }
  written.push(`${kind}: ${ids.length}`);
}

mkdirSync(join(PUBLIC, "img"), { recursive: true });
writeFileSync(join(PUBLIC, "sprites.svg"), await get("/assets/sprites.svg"));
for (const p of images) {
  const target = join(PUBLIC, "img", p);
  mkdirSync(dirname(target), { recursive: true });
  const source = existsSync(target) ? null : await get(`/${p}`, true).catch(() => get(`/assets/${p}`, true));
  if (source) writeFileSync(target, source);
}

console.log(written.join("\n"));
console.log(`${images.size} pictures`);
