import { describe, expect, it } from "vitest";
import { isPlayer, matchMode, parsePlayMode, showsMode, sideOf } from "./play-mode";

const base = { player_b_id: "b", mode_a: null, mode_b: null } as const;

describe("matchMode", () => {
  it("is TTS when both play TTS, Webkamera when both use a webcam, Hibrid when mixed", () => {
    expect(matchMode({ ...base, mode_a: "tts", mode_b: "tts" })).toBe("tts");
    expect(matchMode({ ...base, mode_a: "webcam", mode_b: "webcam" })).toBe("webcam");
    expect(matchMode({ ...base, mode_a: "tts", mode_b: "webcam" })).toBe("hybrid");
  });

  it("counts a player who hasn't chosen as webcam", () => {
    expect(matchMode(base)).toBe("webcam");
    expect(matchMode({ ...base, mode_a: "tts" })).toBe("hybrid");
    expect(matchMode({ ...base, mode_b: "webcam" })).toBe("webcam");
  });

  it("has no mode for a Bye", () => {
    expect(matchMode({ ...base, player_b_id: null, mode_a: "tts" })).toBeNull();
  });
});

describe("helpers", () => {
  it("reads a submitted choice", () => {
    expect(parsePlayMode("tts")).toBe("tts");
    expect(parsePlayMode("webcam")).toBe("webcam");
    expect(parsePlayMode("")).toBeNull();
    expect(parsePlayMode("anything")).toBeNull();
  });

  it("finds a player's side by Karnyx name, ignoring case", () => {
    const m = { a: { karnyx_name: "Dave" }, b: { karnyx_name: "RP" } } as Parameters<typeof sideOf>[0];
    expect(sideOf(m, { id: "x", karnyx_name: "dave" })).toBe("a");
    expect(sideOf(m, { id: "x", karnyx_name: "RP" })).toBe("b");
    expect(sideOf(m, { id: "x", karnyx_name: "Someone" })).toBeNull();
    expect(sideOf(m, { id: "x", karnyx_name: null })).toBeNull();
    expect(sideOf(m, null)).toBeNull();
  });

  it("a player linked to an account matches only that account, never by name", () => {
    const m = {
      a: { karnyx_name: "Dave", profile_id: "p-dave" },
      b: { karnyx_name: "RP", profile_id: null },
    } as Parameters<typeof sideOf>[0];
    expect(sideOf(m, { id: "p-dave", karnyx_name: "Renamed" })).toBe("a");
    expect(sideOf(m, { id: "p-other", karnyx_name: "Dave" })).toBeNull();
    expect(sideOf(m, { id: "p-rp", karnyx_name: "rp" })).toBe("b");
    expect(isPlayer(null, { id: "p", karnyx_name: "Dave" })).toBe(false);
  });

  it("shows the mode on rows once agreed, or once someone has chosen", () => {
    expect(showsMode({ ...base, status: "pending" })).toBe(false);
    expect(showsMode({ ...base, status: "proposed", mode_a: "tts" })).toBe(true);
    expect(showsMode({ ...base, status: "confirmed" })).toBe(true);
    expect(showsMode({ ...base, status: "bye", player_b_id: null })).toBe(false);
  });
});
