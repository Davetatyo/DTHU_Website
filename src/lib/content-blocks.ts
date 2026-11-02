// Content blocks: the building pieces of event and news pages (headings, paragraphs, pictures,
// lists, videos …). Stored as JSON; checked here before saving and again before showing.
// Pure functions only (no database), unit-tested, usable in the browser.

import { safeUrl } from "./publishing";

export type VideoRef = { provider: "youtube"; id: string } | { provider: "twitch"; kind: "video" | "channel"; id: string };

export type ContentBlock =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "img"; path: string; caption?: string }
  | { t: "link"; url: string; label?: string }
  | { t: "list"; ordered: boolean; items: string[] }
  | { t: "quote"; text: string; by?: string }
  | { t: "box"; tone: "info" | "warn"; text: string }
  | { t: "gallery"; paths: string[] }
  | { t: "video"; video: VideoRef }
  | { t: "event"; id: string }
  | { t: "poll"; poll: PollSetup }
  | { t: "pollresult"; id: string }
  | { t: "hr" };

/** A poll as the admin sets it up in the editor (saved to the polls table with the article). */
export type PollSetup = {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  multi: boolean;
  other: boolean;
  /** ISO time when voting closes. */
  closes_at: string;
};

export type BlockType = ContentBlock["t"];

/** What the picture upload actions return to the editors in the browser. */
export type ContentImageResult = { path: string | null; error: string | null };

/** Hungarian names of the block types, as the editor shows them. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  h: "Alcím",
  p: "Bekezdés",
  img: "Kép",
  link: "Link",
  list: "Felsorolás",
  quote: "Idézet",
  box: "Kiemelt doboz",
  gallery: "Galéria",
  video: "Videó",
  event: "Esemény kártya",
  poll: "Szavazás",
  pollresult: "Szavazás eredménye",
  hr: "Elválasztó",
};

/** Blocks events use (owner, 2026-11-03: simple blocks). News may use all of them. */
export const SIMPLE_BLOCKS: BlockType[] = ["h", "p", "img", "link"];
export const ALL_BLOCKS: BlockType[] = ["h", "p", "list", "quote", "box", "img", "gallery", "video", "link", "event", "poll", "pollresult", "hr"];

const MAX_BLOCKS = 150;
const MAX_TEXT = 5000;
const MAX_GALLERY = 30;
const MAX_LIST_ITEMS = 50;
const UUID = /^[0-9a-f-]{36}$/i;

const text = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A picture path in this item's own folder of its bucket: "<item id>/<file>". */
export function isOwnImagePath(path: unknown, ownerId: string): path is string {
  return typeof path === "string" && new RegExp(`^${ownerId}/[A-Za-z0-9._-]+$`).test(path);
}

/**
 * YouTube or Twitch address → what to embed. Accepts youtube.com/watch?v=…, youtu.be/…,
 * youtube.com/shorts/…, twitch.tv/videos/… and twitch.tv/<channel>. Anything else: null.
 */
export function parseVideoUrl(value: unknown): VideoRef | null {
  const href = safeUrl(value);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const ytId = (s: string | null | undefined) => (s && /^[A-Za-z0-9_-]{6,20}$/.test(s) ? s : null);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    return ytId(id) ? { provider: "youtube", id: id! } : null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return ytId(id) ? { provider: "youtube", id } : null;
  }
  if (host === "twitch.tv") {
    const video = url.pathname.match(/^\/videos\/(\d{3,15})$/)?.[1];
    if (video) return { provider: "twitch", kind: "video", id: video };
    const channel = url.pathname.match(/^\/([A-Za-z0-9_]{3,25})\/?$/)?.[1];
    if (channel) return { provider: "twitch", kind: "channel", id: channel.toLowerCase() };
  }
  return null;
}

/** The embed address of a video. Twitch needs the site's own domain as `parent`. */
export function videoEmbedUrl(video: VideoRef, parentHost: string): string {
  if (video.provider === "youtube") return `https://www.youtube-nocookie.com/embed/${video.id}`;
  const parent = encodeURIComponent(parentHost);
  return video.kind === "video"
    ? `https://player.twitch.tv/?video=${video.id}&parent=${parent}&autoplay=false`
    : `https://player.twitch.tv/?channel=${video.id}&parent=${parent}&autoplay=false`;
}

/**
 * Checks the block list the editor sends (JSON). Only the `allowed` block types; empty text
 * dropped; links http(s) only; pictures only from this item's own folder; videos only from
 * YouTube/Twitch. Returns the clean list or a Hungarian error.
 */
export function parseBlocks(
  input: unknown,
  ownerId: string,
  allowed: BlockType[] = ALL_BLOCKS,
): { ok: true; blocks: ContentBlock[] } | { ok: false; error: string } {
  let raw = input;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw || "[]");
    } catch {
      return { ok: false, error: "A tartalom nem olvasható, töltsd újra az oldalt." };
    }
  }
  if (!Array.isArray(raw)) return { ok: false, error: "A tartalom nem olvasható, töltsd újra az oldalt." };
  if (raw.length > MAX_BLOCKS) return { ok: false, error: `Legfeljebb ${MAX_BLOCKS} blokk lehet egy oldalon.` };

  const blocks: ContentBlock[] = [];
  for (const b of raw as Record<string, unknown>[]) {
    if (!b || typeof b !== "object" || !allowed.includes(b.t as BlockType)) continue;
    switch (b.t) {
      case "h":
      case "p": {
        const t = text(b.text, b.t === "h" ? 200 : MAX_TEXT);
        if (t) blocks.push({ t: b.t, text: t });
        break;
      }
      case "img": {
        if (!isOwnImagePath(b.path, ownerId)) return { ok: false, error: "Egy kép hibás, töröld és töltsd fel újra." };
        const caption = text(b.caption, 300);
        blocks.push(caption ? { t: "img", path: b.path, caption } : { t: "img", path: b.path });
        break;
      }
      case "link": {
        const url = safeUrl(b.url);
        if (!url) return { ok: false, error: "Egy link hibás: http:// vagy https:// kezdetű címet adj meg." };
        const label = text(b.label, 120);
        blocks.push(label ? { t: "link", url, label } : { t: "link", url });
        break;
      }
      case "list": {
        const items = (Array.isArray(b.items) ? b.items : []).map((i) => text(i, 1000)).filter(Boolean).slice(0, MAX_LIST_ITEMS);
        if (items.length) blocks.push({ t: "list", ordered: b.ordered === true, items });
        break;
      }
      case "quote": {
        const t = text(b.text, 2000);
        const by = text(b.by, 120);
        if (t) blocks.push(by ? { t: "quote", text: t, by } : { t: "quote", text: t });
        break;
      }
      case "box": {
        const t = text(b.text, 2000);
        if (t) blocks.push({ t: "box", tone: b.tone === "warn" ? "warn" : "info", text: t });
        break;
      }
      case "gallery": {
        const paths = Array.isArray(b.paths) ? b.paths : [];
        if (paths.some((p) => !isOwnImagePath(p, ownerId))) return { ok: false, error: "Egy galériakép hibás, töröld és töltsd fel újra." };
        if (paths.length > MAX_GALLERY) return { ok: false, error: `Egy galériában legfeljebb ${MAX_GALLERY} kép lehet.` };
        if (paths.length) blocks.push({ t: "gallery", paths: paths as string[] });
        break;
      }
      case "video": {
        const v = b.video as Record<string, unknown> | undefined;
        const url =
          v?.provider === "youtube"
            ? `https://youtu.be/${v.id}`
            : v?.provider === "twitch"
              ? `https://www.twitch.tv/${v.kind === "video" ? `videos/${v.id}` : v.id}`
              : b.url;
        const video = parseVideoUrl(url);
        if (!video) return { ok: false, error: "Egy videó hibás: YouTube vagy Twitch linket adj meg." };
        blocks.push({ t: "video", video });
        break;
      }
      case "event": {
        if (typeof b.id === "string" && UUID.test(b.id)) blocks.push({ t: "event", id: b.id });
        break;
      }
      case "poll": {
        const poll = parsePollSetup(b.poll);
        if (!poll.ok) return poll;
        if (blocks.some((x) => x.t === "poll" && x.poll.id === poll.poll.id)) return { ok: false, error: "Ugyanaz a szavazás kétszer szerepel." };
        blocks.push({ t: "poll", poll: poll.poll });
        break;
      }
      case "pollresult": {
        if (typeof b.id === "string" && UUID.test(b.id)) blocks.push({ t: "pollresult", id: b.id });
        break;
      }
      case "hr":
        blocks.push({ t: "hr" });
        break;
    }
  }
  return { ok: true, blocks };
}

const OPTION_ID = /^[a-z0-9]{1,12}$/;

/** Checks a poll set up in the editor: a question, 2–20 distinct options, a closing time. */
export function parsePollSetup(input: unknown): { ok: true; poll: PollSetup } | { ok: false; error: string } {
  const p = (input ?? {}) as Record<string, unknown>;
  if (typeof p.id !== "string" || !UUID.test(p.id)) return { ok: false, error: "Egy szavazás hibás, töröld és hozd létre újra." };
  const question = text(p.question, 300);
  if (!question) return { ok: false, error: "Add meg a szavazás kérdését." };
  const seen = new Set<string>();
  const options: PollSetup["options"] = [];
  for (const o of Array.isArray(p.options) ? (p.options as Record<string, unknown>[]) : []) {
    const label = text(o?.label, 200);
    if (!label) continue;
    if (typeof o.id !== "string" || !OPTION_ID.test(o.id) || seen.has(o.id)) return { ok: false, error: "Egy szavazási lehetőség hibás, töltsd újra az oldalt." };
    seen.add(o.id);
    options.push({ id: o.id, label });
  }
  if (options.length < 2) return { ok: false, error: `A szavazáshoz („${question}”) legalább két lehetőség kell.` };
  if (options.length > 20) return { ok: false, error: "Egy szavazásban legfeljebb 20 lehetőség lehet." };
  const closes = typeof p.closes_at === "string" ? new Date(p.closes_at) : null;
  if (!closes || Number.isNaN(closes.getTime())) return { ok: false, error: `Add meg, mikor zárul a szavazás („${question}”).` };
  return { ok: true, poll: { id: p.id, question, options, multi: p.multi === true, other: p.other === true, closes_at: closes.toISOString() } };
}

/** Pictures the item still uses (card picture + pictures and galleries in the content). */
export function imagePathsInUse(coverPath: string | null, blocks: ContentBlock[]): Set<string> {
  const used = new Set<string>();
  if (coverPath) used.add(coverPath);
  for (const b of blocks) {
    if (b.t === "img") used.add(b.path);
    if (b.t === "gallery") b.paths.forEach((p) => used.add(p));
  }
  return used;
}

/** Polls set up in the content, and polls whose results it shows. */
export function pollsIn(blocks: ContentBlock[]): { setups: PollSetup[]; resultIds: string[] } {
  return {
    setups: blocks.flatMap((b) => (b.t === "poll" ? [b.poll] : [])),
    resultIds: [...new Set(blocks.flatMap((b) => (b.t === "pollresult" ? [b.id] : [])))],
  };
}

/** Ids of events shown as cards in the content. */
export function eventIdsIn(blocks: ContentBlock[]): string[] {
  return [...new Set(blocks.flatMap((b) => (b.t === "event" ? [b.id] : [])))];
}
