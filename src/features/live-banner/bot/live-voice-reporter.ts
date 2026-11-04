// The Discord bot's side of the live banner. Copy this file into the bot; see README.md here.
// It has no dependencies and doesn't know which Discord library the bot uses.
//
// The bot's only job is to tell the website who is in the tournament voice channels, whenever
// that changes and once a minute. The website decides what is live, and tells the bot which
// channels to watch in each reply, so nothing about matches or channels is configured in the bot.

/** Who is in one voice channel right now (Discord IDs as strings). */
export type VoiceChannelReport = { id: string; userIds: string[] };

/** The body of POST /api/live/voice. */
export type VoiceReport = { channels: VoiceChannelReport[] };

/** The reply: the channels to report on from now on. */
export type VoiceReportReply = { watch: string[] };

export type LiveVoiceReporterOptions = {
  /** The website's endpoint, https://dthu.hu/api/live/voice */
  endpoint: string;
  /** The value of LIVE_BOT_SECRET, the same on the website and the bot. */
  secret: string;
  /** IDs of the users in this voice channel right now, from the bot's own cache. */
  listVoiceMembers: (channelId: string) => string[];
  /** Called when a report fails. The next report tries again, so nothing else is needed. */
  onError?: (error: unknown) => void;
  heartbeatMs?: number;
  debounceMs?: number;
  /** Replaced in tests. */
  fetchImpl?: typeof fetch;
};

export type LiveVoiceReporter = {
  /** Call once when the bot is ready. Sends the first report and starts the once-a-minute one. */
  start: () => void;
  /** Call on shutdown. */
  stop: () => void;
  /** Call on every voice state update, with the channel the user left and the one they joined. */
  notifyVoiceChange: (oldChannelId: string | null | undefined, newChannelId: string | null | undefined) => void;
};

export function createLiveVoiceReporter(options: LiveVoiceReporterOptions): LiveVoiceReporter {
  const { endpoint, secret, listVoiceMembers, onError, heartbeatMs = 60_000, debounceMs = 2_000, fetchImpl = fetch } = options;

  let watch: string[] | null = null; // null: the website hasn't told us yet
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let sending = false;
  let sendAgain = false;
  let running = false;

  async function send(): Promise<void> {
    if (sending) {
      sendAgain = true;
      return;
    }
    sending = true;
    try {
      const report: VoiceReport = { channels: (watch ?? []).map((id) => ({ id, userIds: listVoiceMembers(id) })) };
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify(report),
      });
      if (!response.ok) throw new Error(`Live report refused: HTTP ${response.status}`);
      const reply = (await response.json()) as VoiceReportReply;
      // New channels were not in this report, so report them straight away.
      if (reply.watch.some((id) => !watch?.includes(id))) sendAgain = true;
      watch = reply.watch;
    } catch (error) {
      onError?.(error);
    } finally {
      sending = false;
      if (sendAgain && running) {
        sendAgain = false;
        void send();
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      void send();
      heartbeat = setInterval(() => void send(), heartbeatMs);
    },
    stop() {
      running = false;
      clearInterval(heartbeat);
      clearTimeout(debounce);
    },
    notifyVoiceChange(oldChannelId, newChannelId) {
      if (!running || !watch) return;
      const relevant = (id: string | null | undefined) => !!id && watch!.includes(id);
      if (oldChannelId === newChannelId || (!relevant(oldChannelId) && !relevant(newChannelId))) return;
      // Several people often move at once, so wait a moment and send one report.
      clearTimeout(debounce);
      debounce = setTimeout(() => void send(), debounceMs);
    },
  };
}
