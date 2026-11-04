import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveVoiceReporter, type VoiceReport } from "./live-voice-reporter";

const CHANNEL = "111111111111111111";
const NEW_CHANNEL = "222222222222222222";
const ELSEWHERE = "999999999999999999";
const USER = "333333333333333333";

function setup(watch: string[] = [CHANNEL]) {
  const reports: VoiceReport[] = [];
  const headers: Record<string, string>[] = [];
  const state = { watch, status: 200 };
  const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
    reports.push(JSON.parse(String(init?.body)));
    headers.push(init?.headers as Record<string, string>);
    return new Response(JSON.stringify({ watch: state.watch }), { status: state.status });
  });
  const onError = vi.fn();
  const reporter = createLiveVoiceReporter({
    endpoint: "https://example.test/api/live/voice",
    secret: "test-secret",
    listVoiceMembers: (id) => (id === CHANNEL ? [USER] : []),
    onError,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { reporter, reports, headers, state, onError, fetchImpl };
}

/** Lets the pending report and any follow-up finish. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("live voice reporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks which channels to watch, then reports who is in them", async () => {
    const { reporter, reports, headers } = setup();
    reporter.start();
    await settle();
    expect(reports).toEqual([{ channels: [] }, { channels: [{ id: CHANNEL, userIds: [USER] }] }]);
    expect(headers[0].authorization).toBe("Bearer test-secret");
    reporter.stop();
  });

  it("reports once a minute", async () => {
    const { reporter, reports } = setup();
    reporter.start();
    await settle();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reports).toHaveLength(3);
    reporter.stop();
  });

  it("reports soon after someone joins or leaves a watched channel", async () => {
    const { reporter, reports } = setup();
    reporter.start();
    await settle();
    reporter.notifyVoiceChange(null, CHANNEL);
    reporter.notifyVoiceChange(CHANNEL, null);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(reports).toHaveLength(3); // several changes, one report
    reporter.stop();
  });

  it("ignores changes in other channels and mute or camera changes", async () => {
    const { reporter, reports } = setup();
    reporter.start();
    await settle();
    reporter.notifyVoiceChange(null, ELSEWHERE);
    reporter.notifyVoiceChange(CHANNEL, CHANNEL);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(reports).toHaveLength(2);
    reporter.stop();
  });

  it("picks up a channel added on the website", async () => {
    const { reporter, reports, state } = setup();
    reporter.start();
    await settle();
    state.watch = [CHANNEL, NEW_CHANNEL];
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reports.at(-1)?.channels.map((c) => c.id)).toEqual([CHANNEL, NEW_CHANNEL]);
    reporter.stop();
  });

  it("survives a failed report and tries again at the next one", async () => {
    const { reporter, reports, state, onError } = setup();
    state.status = 503;
    reporter.start();
    await settle();
    expect(onError).toHaveBeenCalledTimes(1);
    state.status = 200;
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(reports.at(-1)).toEqual({ channels: [{ id: CHANNEL, userIds: [USER] }] });
    reporter.stop();
  });

  it("survives the website being unreachable", async () => {
    const { reporter, fetchImpl, onError } = setup();
    fetchImpl.mockRejectedValueOnce(new Error("offline"));
    reporter.start();
    await settle();
    expect(onError).toHaveBeenCalledTimes(1);
    reporter.stop();
  });

  it("sends nothing after stop", async () => {
    const { reporter, reports } = setup();
    reporter.start();
    await settle();
    reporter.stop();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(reports).toHaveLength(2);
  });
});
