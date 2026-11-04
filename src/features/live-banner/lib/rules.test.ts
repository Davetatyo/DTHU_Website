import { describe, expect, it } from "vitest";
import { decideLiveWrites, inStartWindow, isJoinUrl, isLive, liveEndsAt, parseVoiceReport, presenceFrom, type LiveCandidate, type MatchLive } from "./rules";

const CHANNEL = "111111111111111111";
const OTHER_CHANNEL = "222222222222222222";
const ALICE = "333333333333333333";
const BOB = "444444444444444444";
const AT = "2026-11-06T19:00:00.000Z";

const minutes = (n: number) => new Date(Date.parse(AT) + n * 60_000);
const iso = (n: number) => minutes(n).toISOString();

const match = (over: Partial<LiveCandidate> = {}): LiveCandidate => ({
  id: "m1",
  status: "confirmed",
  scheduled_at: AT,
  discordIds: [ALICE, BOB],
  ...over,
});
const row = (over: Partial<MatchLive> = {}): MatchLive => ({
  match_id: "m1",
  channel_id: CHANNEL,
  started_at: iso(0),
  last_seen_at: iso(0),
  ended_at: null,
  source: "voice",
  ...over,
});
const present = (userId = ALICE, channelId = CHANNEL) => new Map([[userId, channelId]]);
const rows = (r?: MatchLive) => new Map(r ? [[r.match_id, r]] : []);

describe("start window", () => {
  it("is 30 minutes either side of the match time", () => {
    expect(inStartWindow(AT, minutes(-31))).toBe(false);
    expect(inStartWindow(AT, minutes(-30))).toBe(true);
    expect(inStartWindow(AT, minutes(30))).toBe(true);
    expect(inStartWindow(AT, minutes(31))).toBe(false);
  });
});

describe("how long a match stays live", () => {
  it("stays on for 1.5 hours even if everyone left early", () => {
    const r = row({ last_seen_at: iso(5) });
    expect(isLive(r, minutes(89))).toBe(true);
    expect(isLive(r, minutes(90))).toBe(false);
  });

  it("stays on past 1.5 hours while a player is still there", () => {
    const r = row({ last_seen_at: iso(120) });
    expect(liveEndsAt(r).toISOString()).toBe(iso(123));
    expect(isLive(r, minutes(122))).toBe(true);
    expect(isLive(r, minutes(123))).toBe(false);
  });

  it("goes off at once when an admin stops it", () => {
    expect(isLive(row({ ended_at: iso(10) }), minutes(11))).toBe(false);
  });
});

describe("decideLiveWrites", () => {
  it("goes live when one player joins inside the window", () => {
    expect(decideLiveWrites([match()], rows(), present(), minutes(-10))).toEqual([{ kind: "start", match_id: "m1", channel_id: CHANNEL }]);
  });

  it("works when the site knows only one of the players", () => {
    const writes = decideLiveWrites([match({ discordIds: [BOB] })], rows(), present(BOB), minutes(0));
    expect(writes).toHaveLength(1);
  });

  it("ignores people who aren't in the match", () => {
    expect(decideLiveWrites([match({ discordIds: [BOB] })], rows(), present(ALICE), minutes(0))).toEqual([]);
  });

  it("ignores a player outside the window", () => {
    expect(decideLiveWrites([match()], rows(), present(), minutes(-31))).toEqual([]);
    expect(decideLiveWrites([match()], rows(), present(), minutes(31))).toEqual([]);
  });

  it("ignores matches that aren't confirmed", () => {
    for (const status of ["played", "pending", "proposed", "bye"]) {
      expect(decideLiveWrites([match({ status })], rows(), present(), minutes(0))).toEqual([]);
    }
  });

  it("keeps a live match going past the window and follows the player to another channel", () => {
    const r = row({ started_at: iso(20), last_seen_at: iso(100) });
    expect(decideLiveWrites([match()], rows(r), present(ALICE, OTHER_CHANNEL), minutes(101))).toEqual([
      { kind: "seen", match_id: "m1", channel_id: OTHER_CHANNEL },
    ]);
  });

  it("can't restart a match an admin stopped", () => {
    expect(decideLiveWrites([match()], rows(row({ ended_at: iso(5) })), present(), minutes(10))).toEqual([]);
  });

  it("goes live again after the match was moved to a new time", () => {
    const old = row({ started_at: iso(-600), last_seen_at: iso(-600) });
    expect(decideLiveWrites([match()], rows(old), present(), minutes(0))).toEqual([{ kind: "start", match_id: "m1", channel_id: CHANNEL }]);
  });

  it("handles two matches at once, each in its own channel", () => {
    const second = match({ id: "m2", discordIds: [BOB] });
    const first = match({ discordIds: [ALICE] });
    const both = new Map([
      [ALICE, CHANNEL],
      [BOB, OTHER_CHANNEL],
    ]);
    expect(decideLiveWrites([first, second], rows(), both, minutes(0))).toEqual([
      { kind: "start", match_id: "m1", channel_id: CHANNEL },
      { kind: "start", match_id: "m2", channel_id: OTHER_CHANNEL },
    ]);
  });
});

describe("presenceFrom", () => {
  it("only counts tournament channels", () => {
    const report = {
      channels: [
        { id: CHANNEL, userIds: [ALICE] },
        { id: OTHER_CHANNEL, userIds: [BOB] },
      ],
    };
    expect(presenceFrom(report, [CHANNEL])).toEqual(new Map([[ALICE, CHANNEL]]));
  });
});

describe("parseVoiceReport", () => {
  it("accepts a report, also an empty one", () => {
    expect(parseVoiceReport({ channels: [] })).toEqual({ channels: [] });
    const report = { channels: [{ id: CHANNEL, userIds: [ALICE] }] };
    expect(parseVoiceReport(report)).toEqual(report);
  });

  it("drops extra fields", () => {
    expect(parseVoiceReport({ channels: [{ id: CHANNEL, userIds: [], x: 1 }], y: 2 })).toEqual({ channels: [{ id: CHANNEL, userIds: [] }] });
  });

  it("refuses anything else", () => {
    for (const bad of [null, "x", 1, {}, { channels: "x" }, { channels: [null] }, { channels: [{ id: "abc", userIds: [] }] }, { channels: [{ id: CHANNEL }] }, { channels: [{ id: CHANNEL, userIds: ["abc"] }] }]) {
      expect(parseVoiceReport(bad)).toBeNull();
    }
  });
});

describe("isJoinUrl", () => {
  it("only accepts Discord links", () => {
    expect(isJoinUrl(`https://discord.com/channels/${CHANNEL}/${OTHER_CHANNEL}`)).toBe(true);
    expect(isJoinUrl("https://discord.gg/abc123")).toBe(true);
    expect(isJoinUrl("https://discord.gg.evil.example/abc")).toBe(false);
    expect(isJoinUrl("http://discord.gg/abc")).toBe(false);
    expect(isJoinUrl("javascript:alert(1)")).toBe(false);
  });
});
