# Feature 02: Discord Match Reporting, Website Sync & Live Tournament Spectating

**Project:** Dice Throne Hungary  
**Status:** Exploration and architecture proposal only. **Do not implement until approved.**  
**Related feature:** `01-ranking-system.md` (seasonal LP / Glicko-2 / career stats).  
**Scope:** The existing Discord bot and the existing website/Supabase codebase.

## Product objective

Make Discord and the website operate as one competitive Dice Throne platform:

1. A player reports a completed casual or ranked 1v1 match with `/result opponent:@DiscordUser` in the designated Discord results channel.
2. The bot opens a Discord modal for hero selection, each player's remaining HP and ultimate count, and a clearly specified result (win/loss/draw or applicable double-KO rule).
3. The website immediately creates a **pending** match entry, not a finalized match.
4. Only the actual tagged opponent may confirm or dispute the report. Until accepted, it does not affect official career stats, seasonal stats, win rate, or rating.
5. When the opponent accepts, the website finalizes the match exactly once. An eligible casual match affects casual/career stats; an eligible ranked match affects ranked stats and triggers the agreed skill/LP engine from the separate ranking-system design.
6. Existing scheduled tournament pairings on `időpontfoglaló` can have a linked Discord voice/video room. A match card offers a way to open that room so permitted spectators can watch players' cameras within Discord.
7. The existing Swiss tournament and tournament result-confirmation rules must remain intact. Do not duplicate the same match or apply rating twice.

## Findings from the uploaded Discord bot (inspect afresh before proposing)

The uploaded `matchmaking-bot.zip` includes a Node.js / `discord.js` 14 bot in `matchmaking-bot/index.js`.

- Existing channels for normal/ranked matchmaking and normal/ranked result posting are configured by environment variables.
- Existing commands include `!dtw`, `!dtd`, `!dt`, `!dta`, `!dtm`, `!results`, and role-management/admin commands.
- Existing results originate from screenshot messages; participants use win/loss/correction reaction emojis.
- Results are stored in `match-results.json`, auto-saved after about one hour if the current reaction requirements appear satisfied, and can be exported to Excel.
- `index.js` is approximately 690 lines, organized around message and reaction listeners; no slash-command registration or website integration was found in this uploaded bot.
- The uploaded ZIP contains a nonempty `.env` with `DISCORD_TOKEN` and Discord channel IDs. **Never print, copy, log, commit, or expose secrets.** Recommend rotating the token if this ZIP has been shared beyond trusted private storage. Add `.gitignore` and a redacted `.env.example`; exclude `node_modules`, runtime JSON data, generated exports, and secrets from future archives.
- The existing reaction-based result flow needs a safe migration plan. Do not leave two authoritative result-ingestion paths active that can double-count the same game.

The website code was **not** included in this ZIP. Inspect the website repository independently. Do not invent website files, routes, table names, or authentication assumptions. The current website has Supabase according to the project context. Confirm the actual schema and deployment architecture before design decisions.

---

# CLAUDE CODE: PHASE 1 EXPLORATION PROMPT

Act as a senior full-stack software architect, Discord platform integrator, security-focused backend engineer, and experienced developer of tournament systems.

**Do not change application code, database data, migrations, or Discord server configuration yet. Do not run a destructive command. Do not commit, push, deploy, or rotate credentials. Your job is to inspect both codebases and produce a detailed proposal that I will review and approve separately.**

## A. Repository reconnaissance

Investigate the Discord bot and website **as they actually exist**.

### Discord bot
- Identify entry points, package versions, intents, scopes, permissions, command registration, matchmaking/result channels, reaction handlers, persistent storage, exports, background timers, and deployment.
- Identify all dependencies on `match-results.json`, the one-hour auto-save, reaction result states, and the result export command.
- Determine whether it is best to incrementally modularize this single-file Node.js bot or restructure it, with minimal risk to current commands.
- Check whether `discord.js` in the project supports the required Discord modal components and selects; use current Discord documentation rather than assuming old restrictions.
- Inspect safety concerns without displaying secret values. Record migration risks and missing tests.

### Website
- Read relevant project docs (`README.md`, `STATE.md`, etc.), framework, identity/authentication flow, route handlers/server actions/API, Supabase migrations, RLS, game entities, heroes, match outcomes, tournament pairings, scheduling (`időpontfoglaló`), user profiles, and standings/statistics.
- Trace exactly how existing tournament results are submitted, confirmed, corrected, and displayed.
- Locate or propose Discord account linking: stable Discord user ID <-> internal authenticated player/profile ID. Never rely on nicknames, display names, or untrusted profile text as identity.
- Identify whether existing match types are sufficient to distinguish tournament, ranked non-tournament, and casual matches.
- Identify whether current tournament game outcomes allow ties, mutual knockout/double KO, forfeits, or other exceptional results.

**Deliver evidence with exact file paths, function names, table names, and code references. Mark unknowns clearly rather than inventing an implementation.**

## B. Design the `/result` flow

### Discord command

Prefer an application command of the form:

`/result opponent:@Member`

- Only available in the configured casual-result and ranked-result channels. The server must also validate channel ID, not just rely on user interface permissions.
- The category is derived from the **trusted actual channel ID**: casual or ranked. Players cannot change category by typing free text.
- Allow the command to open a modal immediately after selecting the opponent.
- The opponent is a Discord `USER` option, not a manually typed display name.
- The submitting player is determined from the authenticated Discord interaction, not from modal text.
- Self-matches, bot opponents, unlinked identities, invalid guild/channel contexts, and inappropriate duplicate submissions are rejected with clear localized feedback.
- Investigate account-linking onboarding if one or both players do not have website accounts; do not silently create impersonable identities.

### Modal fields and validations

Use the supplied screenshot as a UI reference, but improve usability:
- Reporter hero: preferably selectable from the game's existing hero catalog.
- Reporter final HP and ultimate count as separate validated numeric values.
- Opponent hero and final HP/ultimate count with the same validation.
- Explicit match outcome / winner / draw, according to the actual Dice Throne rules and current website domain model. Do not blindly infer the winner only from HP fields; support appropriate special cases.
- Optional evidence or match notes only if warranted; investigate Discord's component limits and whether evidence belongs in a follow-up interaction or website upload rather than overloading the modal.
- Validate hero identifiers against the real catalog, numeric boundaries and semantics, optional fields, and all consistency constraints on the backend.
- Prefer Hungarian UI strings; support the project's existing localization strategy.

### Submission and website behavior

1. The bot authenticates to a limited server-side website API; no website service role keys or privileged database credentials are placed in Discord messages or a browser.
2. The server validates the bot's identity, the real Discord actor and selected opponent, identity linkage, channel classification, all fields, and eligibility.
3. Store a match with an explicit `PENDING_CONFIRMATION` status and immutable submission evidence/metadata.
4. Return a stable match ID and website URL; the bot acknowledges submission with an ephemeral response or appropriate channel message.
5. Pending matches appear in a clearly labeled section of the website, but do not count in official match totals, win rates, tournaments, or rating updates.
6. The opponent receives an accessible Discord interaction (button-based confirmation/dispute, with a website fallback), with enough details to review heroes, winner, HP, ultimates, and match type.
7. Confirm the Discord ID on button interactions and the website login identity on website confirmations. A third party cannot accept for the opponent.
8. `ACCEPT` transitions the record to `FINALIZED` once, atomically creates the relevant stats/rating event(s), and sends appropriate notifications. `DISPUTE` transitions to a review state without rating effects. `EXPIRE`, `CANCEL`, `REJECT`, and admin correction paths must be defined with sensible policy.
9. Duplicate webhooks, double button clicks, retries, reconnects, and bot restarts must be idempotent. Consider race conditions between confirmation, rejection, and admin correction.
10. Investigate how a player can request a correction after finalization without editing history silently or double-applying a reversed rating change. Preserve an audit trail.

### Link to Feature 01 (ranking)

- Define a stable `FinalizedRatedMatch` domain event/contract containing match ID, both website player IDs, result, match type, timestamp, rating eligibility and source.
- **Do not invent or implement a temporary Elo formula.** Our separate ranking proposal is considering Glicko-2 with a seasonal LP system. Specify exactly where that engine will subscribe and how a match is applied once when it is eventually built.
- A casual match should affect casual/career stats but not ranked MMR/LP unless the published policy changes.
- A bye, no-show, cancellation, disputed match, or unconfirmed result must not silently produce rated wins.
- A tournament match already recorded on the website must not be submitted as an unrelated Discord match. Either link it to the existing tournament pairing ID and use the canonical tournament workflow, or block separate `/result` submissions for that game. Propose the best option based on actual code.

## C. Audit and replace the existing result workflow safely

- Investigate preserving all `!dt*` matchmaking commands, reaction-based roles, welcome messages and useful Excel exports.
- Compare the current screenshot/reaction auto-save behavior against the new two-party confirmation model.
- Propose a temporary transition for historical JSON records; distinguish already saved vs unverified and avoid assigning unearned rated results.
- Decide whether screenshots stay optional evidence, and whether the one-hour auto-save should be removed or restricted to legacy non-rating data.
- Define how to disable/reconcile the legacy flow once the new system is live.
- Explicitly address the current model's ability to collect multiple losers or mutual losses, compared with the desired 1v1 rating model.
- Preserve source attribution and exportability without storing the authoritative new match history in local JSON.

## D. Tournament scheduled matches and Discord spectating

Investigate the **actual** website scheduling system (`időpontfoglaló`) and how scheduled tournament fixtures or reservations are represented.

Target user experience:
1. An approved/scheduled tournament fixture has two website players and a start time.
2. At an appropriate configurable time before the fixture, the integration creates or assigns a matching Discord voice/video room.
3. Store the Discord guild ID, channel ID, corresponding website fixture ID, owner/source, access policy, lifecycle status and timestamps.
4. A website match card exposes `Megtekintés Discordon` / `Watch on Discord` once a valid room is available.
5. A status distinction should exist between `scheduled`, `room ready`, `players present`, `possibly live`, `ended`, and `cancelled`. Scheduled time alone must not mark a match as actively being watched.
6. People with the required Discord membership and permissions can open the channel, join it themselves, and choose the available player camera feeds inside Discord.
7. The two players should be able to speak and share their cameras. Spectators should normally be listen-only and unable to interrupt, unless the tournament's moderators allow otherwise.
8. Consider explicit opt-in/consent for public spectating, with admin override according to published tournament policy; do not publish private room links to users without access.
9. After the match ends, handle cleanup or reuse safely. Reschedules, forfeits, overlapping matches, bot downtime/restart, deleted channels, abandoned rooms, and stale links must not break the website.

Evaluate architectural alternatives:
- **Dedicated voice room per fixture**, created just before scheduled time, with restricted player/spectator permissions and cleanup.
- **Reusable pool of tournament voice rooms**, assigned to fixtures, to reduce channel churn and permission complexity.
- Optional Discord Scheduled Events integration, only if it adds value.

Explain Discord's actual limitations: a website link or Discord deep link can navigate to a channel, but does **not** guarantee automatic joining, camera playback, in-page Discord video embedding, or permission bypass. Verify link behavior on desktop browser, desktop app, and mobile. Provide a fallback for people not in the server or lacking permissions. Verify whether voice-state events can establish player presence; never claim presence proves their cameras are transmitting unless verified with the platform's supported signals.

Give an explicit proposal for `GuildVoiceStates` intent, `Manage Channels` permissions if needed, `Connect`, `Speak`, `Video`, channel access control, and any needed permission overrides. Do not request broad Discord permissions unnecessarily.

## E. System architecture and proposed data model

Recommend a clean integration based on existing infrastructure, potentially:

- Discord bot as interaction/user-interface adapter.
- Website backend/Supabase as authoritative source for matches, confirmation states, tournaments, and profiles.
- One secure server-to-server entry point for bot submissions, verified with bot credentials or signed integration requests, rate limiting, replay protection, and full validation.
- Website-to-bot command/event mechanism for scheduled room provisioning, safe retries, and synchronized state.
- Optional Supabase realtime/subscription invalidation for promptly updating match cards and player profiles.

Propose tables/fields **only after checking existing schema**, covering at minimum:
- stable website-player to Discord-user identity linkage;
- match source/type/status and authoritative result;
- reporter/opponent confirmations and audit history;
- source external ID and idempotency key;
- optional tournament fixture relation;
- room assignment/lifecycle, guild/channel IDs, scheduled start/end and consent/access mode;
- finalized match event ledger or existing equivalent for downstream ratings;
- anti-abuse audit records and minimal necessary retention.

Explain RLS, backend authorization, bot credential storage, Discord webhook security, least-privilege scopes, and secret rotation. Recommend migration and rollback strategies. Do not put Supabase service-role keys in the Discord client or exposed frontend bundles.

## F. Edge cases, fairness, and abuse prevention

Investigate and specify behavior for:

- Unlinked Discord user / missing website profile.
- Reporter tags themselves, a bot, a player who left the server, or the wrong opponent.
- Both users submit the same game in opposite directions.
- Repeated games between the same opponents within a short time.
- Conflicting results, duplicate submission, and late confirmation.
- Opponent never responds; DMs closed; user blocks the bot.
- Player edits or deletes evidence; support for admin review.
- Retroactive corrections, tournament result disputes, rollback/replay of rating ledger.
- Bot offline, website offline, retry storm, network timeouts, API rate limits.
- Matches spanning a June 30/July 1 or December 31/January 1 season boundary; define one canonical rated-match timestamp policy.
- Attempts to farm ranked games with colluding accounts; detect suspicious repeated head-to-head results for review without blindly penalizing legitimate small-community matches.
- Public spectator access vs private tournament matches; late starts; reschedules; spectators already in a room during cleanup.
- Different Discord client behavior; missing video feed; permissions that prevent spectators joining.
- Website already has a verified tournament report for a scheduled fixture: exactly-once processing and no duplicate rating changes.

## G. Testing and rollout plan

Design unit/integration tests for:
- slash-command registration and channel enforcement;
- opponent identity verification;
- modal data normalization and validation;
- pending -> accepted/disputed/expired/admin-corrected transitions;
- unauthorized confirmation attempts;
- idempotency and concurrency under duplicate messages/retries;
- no stats or rating before acceptance;
- correct casual vs ranked behavior;
- tournament source deduplication;
- data migrations and preservation of existing Swiss logic;
- scheduled room creation, permissions, reschedule, lifecycle and cleanup;
- live status accuracy and safe fallback when bot/Discord is unavailable;
- secret leakage checks and RLS restrictions.

Separate tests that can run without live Discord from integration smoke tests that need a test Discord guild and local or staging Supabase. Identify which tests are currently missing from the uploaded bot (`npm test` currently has no meaningful test script).

Propose a staged rollout with feature flags:
1. Account linking and secure backend match API.
2. `/result` with pending+confirm/dispute, casual initially.
3. Website profile stats and canonical result ledger.
4. Ranked eligibility and integration point for the later rating engine.
5. Scheduled Discord game rooms, website watch links, and status sync.
6. Retirement of legacy auto-save/reaction ratings once reconciled.

The order may change if code inspection reveals dependencies.

## H. Required Phase 1 output

Provide one structured implementation proposal with:

1. **As-is architecture map**, with verified code references for *both* repositories.
2. **Recommended user journeys** for casual result, ranked result, opponent confirmation/dispute and live spectating.
3. **Discord platform constraints** and a clear feasibility assessment for modal UX and voice/video linking.
4. **Proposed backend integration / message flow** and idempotency/permissions model.
5. **Database proposal**, showing whether existing tables can be reused.
6. **Bot refactoring proposal** and migration away from local JSON, without breaking matchmaking commands.
7. **Website UI proposal**, including pending reports, player stats, match cards and spectator links.
8. **Risks, dependencies and unresolved product decisions**, especially the rating-engine dependency from `01-ranking-system.md`.
9. **File-by-file implementation roadmap** for bot and website, no code changes yet.
10. **Test strategy with named test scenarios**, acceptance criteria, and rollback plan.
11. **Recommended minimum viable version** and later improvements.

Don't fabricate inspected results, passed tests, current deployment details, or Discord capabilities. Where documentation is ambiguous, propose a small test in a dedicated dev guild.

**STOP after presenting the exploration and architecture. Wait for explicit approval to implement.**

---

## Product decisions to settle after Claude's audit

These are recommendations, not presumed facts:

1. **Ranked reports:** Use actual ranked-results channel ID, require two linked accounts and an explicit result confirmation.
2. **Pending visibility:** Show to involved players immediately; public display optional, clearly tagged pending.
3. **Result semantics:** Explicit winner/draw, hero catalog selection and separate HP/ultimate input. Define double-KO behavior with game rules.
4. **Approval workflow:** Discord buttons plus website fallback, no third-party approval; disputes escalate to moderator review.
5. **Rating:** No rated changes until Feature 01's approved rating engine is available. Never invent a separate ad hoc Elo subsystem.
6. **Tournament matches:** Reuse canonical tournament fixture and confirmation system, not an independent duplicate `/result` entry.
7. **Spectating:** Dedicated permissions and opt-in public rooms. Link to Discord rather than attempting unsupported browser video embeds or automatic call joins.
8. **Current secrets:** The uploaded ZIP has a real-looking Discord token and no `.gitignore`. Exclude this from all future shared archives; rotate the token if exposed outside a trusted environment.
