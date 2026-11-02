import { describe, expect, it } from "vitest";
import { eventIdsIn, imagePathsInUse, parseBlocks, parseVideoUrl, SIMPLE_BLOCKS, videoEmbedUrl } from "./content-blocks";
import { parseInline, stripInline } from "./inline-format";

const ID = "99999999-8888-7777-6666-555555555555";

describe("parseVideoUrl", () => {
  it("understands YouTube addresses", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideoUrl("https://youtube.com/shorts/abcDEF12345")).toEqual({ provider: "youtube", id: "abcDEF12345" });
  });

  it("understands Twitch videos and channels", () => {
    expect(parseVideoUrl("https://www.twitch.tv/videos/123456789")).toEqual({ provider: "twitch", kind: "video", id: "123456789" });
    expect(parseVideoUrl("https://twitch.tv/DTHU_Live")).toEqual({ provider: "twitch", kind: "channel", id: "dthu_live" });
  });

  it("rejects other sites and unsafe links", () => {
    expect(parseVideoUrl("https://vimeo.com/123")).toBeNull();
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseVideoUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
  });

  it("builds privacy-friendly YouTube and parent-bound Twitch embeds", () => {
    expect(videoEmbedUrl({ provider: "youtube", id: "dQw4w9WgXcQ" }, "dthu.hu")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl({ provider: "twitch", kind: "channel", id: "dthu" }, "dthu.hu")).toContain("channel=dthu&parent=dthu.hu");
  });
});

describe("parseBlocks", () => {
  it("drops block types that aren't allowed (events: simple blocks only)", () => {
    const r = parseBlocks([{ t: "p", text: "x" }, { t: "hr" }, { t: "quote", text: "y" }], ID, SIMPLE_BLOCKS);
    expect(r.ok && r.blocks).toEqual([{ t: "p", text: "x" }]);
  });

  it("rejects galleries with other items' pictures and unknown videos", () => {
    expect(parseBlocks([{ t: "gallery", paths: ["other/a.webp"] }], ID).ok).toBe(false);
    expect(parseBlocks([{ t: "video", url: "https://example.com/v" }], ID).ok).toBe(false);
  });

  it("re-reads a saved video block", () => {
    const r = parseBlocks([{ t: "video", video: { provider: "twitch", kind: "video", id: "123456789" } }], ID);
    expect(r.ok && r.blocks).toEqual([{ t: "video", video: { provider: "twitch", kind: "video", id: "123456789" } }]);
  });

  it("collects pictures and event ids", () => {
    const blocks = [
      { t: "gallery" as const, paths: [`${ID}/a.webp`] },
      { t: "img" as const, path: `${ID}/b.webp` },
      { t: "event" as const, id: ID },
      { t: "event" as const, id: ID },
    ];
    expect([...imagePathsInUse(`${ID}/c.webp`, blocks)].sort()).toEqual([`${ID}/a.webp`, `${ID}/b.webp`, `${ID}/c.webp`]);
    expect(eventIdsIn(blocks)).toEqual([ID]);
  });
});

describe("parseInline", () => {
  it("finds bold, italic and links", () => {
    expect(parseInline("Ez **fontos**, ez *dőlt*, ez [link](https://dthu.hu).")).toEqual([
      { t: "text", text: "Ez " },
      { t: "b", text: "fontos" },
      { t: "text", text: ", ez " },
      { t: "i", text: "dőlt" },
      { t: "text", text: ", ez " },
      { t: "a", text: "link", href: "https://dthu.hu/" },
      { t: "text", text: "." },
    ]);
  });

  it("leaves unsafe links as plain text and strips marks", () => {
    expect(parseInline("[x](javascript:alert(1))")[0].t).toBe("text");
    expect(stripInline("**A** és *B*")).toBe("A és B");
  });
});
