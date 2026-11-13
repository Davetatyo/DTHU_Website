# Feature 03: Website Match Reporting & Unified Match Lifecycle

**Project:** Dice Throne Hungary  
**Status:** Architecture exploration and proposal only. **Do not implement without explicit approval.**  
**Dependencies:** `01-ranking-system.md` (proposed career skill rating, seasonal LP, all-time statistics) and `02-discord-match-reporting-and-live-spectating.md` (Discord `/result`, confirmations, website sync, tournament voice-room links).  
**Repositories:** Existing website/Supabase project, and Discord bot repository where relevant.

## Product goal

Players must be able to report and confirm real Dice Throne games **directly on the website**, not only through Discord. A Discord-reported game, website-reported game, and scheduled tournament game should all use **one canonical game/match entity, one validation and confirmation policy, one source of official stats, and one eventually integrated ranking engine**. Each should be traceable to the player identities and their chosen heroes.

**Scope:** Reporting completed real-life/remote games and managing verified results. This is **not** a request to implement an online Dice Throne combat simulator or to automatically recognize live moves/camera video.

### Non-negotiable product behavior

1. Logged-in Player A chooses **Report match** on the website.
2. For standalone matches, they select **Casual** or **Ranked**, choose a registered opponent, select both heroes, fill each player's final HP and ultimate count, and specify the match outcome (including draw if supported).
3. The backend creates a **PENDING_CONFIRMATION** record immediately, visible as pending, but the match does **not** count toward official stats, win rate, seasonal progress, or rating.
4. Only Player B (or a formally authorized tournament official in a documented exceptional path) may confirm or dispute the record. The opponent must see the complete submitted details, not just a generic confirmation request.
5. A valid confirmation finalizes the canonical match **exactly once**, then updates the appropriate statistics; an eligible ranked match will also feed the approved seasonal/MMR engine from Feature 01 when it exists.
6. If reported through Discord, the **same website record and confirmation rules** apply. Accepting from either interface must update the other consistently, without duplicate finalization.
7. A tournament game must be linked to its **existing tournament fixture/pairing**, prefill known participants/context, and follow the tournament's existing official result-validation and standings workflows. Do not treat tournament play as a free-standing second game.
8. Match history must clearly distinguish **Casual**, **Ranked**, and **Tournament** contexts, with a separate flag for whether a tournament fixture is eligible to affect the global ranked ladder. Match submission **source** (website/Discord/admin) is a separate dimension, not a separate match category.
9. Career statistics and past finalized results persist through season resets. A match can never be independently counted twice just because it was confirmed, imported, edited, and viewed from multiple interfaces.

---

# CLAUDE CODE: PHASE 1 EXPLORATION PROMPT

Act as a senior full-stack architect, domain-driven backend developer, Supabase/PostgreSQL security specialist, tournament-platform designer, and UX engineer.

**DO NOT WRITE OR MODIFY APP CODE, DATABASE MIGRATIONS, DOCUMENTATION, OR DATA AT THIS STAGE. DO NOT COMMIT, PUSH, OR DEPLOY. First audit the real code and then propose a complete implementation. Wait for my explicit approval.**

## A. Inspect the code as it actually exists

In the website repository, inspect and cite exact paths/functions/tables for:

- Framework, routing, server/API implementation, auth and session handling, authorization, middleware, Supabase clients, and relevant RLS policies.
- Player accounts/profiles, Discord identifiers and account-linking strategy if present, user-facing player search, display-name vs stable user-ID behavior.
- Current match/game data model: heroes, final HP, ultimates, winner, draw, concede/forfeit, timestamps, evidence, opponent relationship, stats, match history.
- Existing scheduled tournament pairing, `időpontfoglaló`, result submission and approval, tournament standings, Swiss/Buchholz, disputes, correction and admin workflows.
- Existing casual/ranked or ELO-related logic, if any. Check whether prior half-built features are in the code or only planned.
- Existing profile pages, leaderboards, navigational affordances, responsive component library, translations/Hungarian copy.
- Current database migrations, constraints, indexes, SQL functions, triggers, realtime/subscriptions, test fixtures, test environment and deployment topology.

Read `01-ranking-system.md` and `02-discord-match-reporting-and-live-spectating.md` **if they exist**. Their plans are architecture intentions, not evidence of already implemented functionality. If absent, use only the overview in this file and mark gaps. Inspect Discord bot code if accessible to identify the existing JSON/reaction result flow and how it will hand off to website APIs.

**Never invent current file paths, DB tables, endpoints, schemas, test results, or capabilities.** Separate verified findings, assumptions and proposals explicitly.

## B. Design website user journeys

### B1. Standalone Casual match report

Propose a mobile-friendly flow accessible from player profile/dashboard and match history:

1. Authenticated reporter is derived from the session, **not chosen by arbitrary form input**.
2. Select `Casual` (trusted backend classification, not spoofable by manipulating client state).
3. Search/select exactly one eligible registered opponent by stable account ID; prevent self-play, duplicate accounts, and inappropriate fake identities.
4. Select each player's hero from the authoritative hero catalog, including any expansions/edition distinctions currently supported.
5. Enter each player's **remaining HP** and **ultimate count** as separate validated values (do not force users to type ambiguous `HP, ultimates` strings).
6. Select a reported outcome: reporter win / opponent win / draw or the allowed result states in the website's real Dice Throne rules. Consider special win conditions, double knockout, concession, and missing/not-applicable HP. **Do not blindly determine the winner from final HP**.
7. Show clear match summary and optionally notes/evidence if the current product supports or needs these.
8. Submit to create a pending report. Show a stable match URL and `Awaiting opponent confirmation` label.
9. The opponent sees a notification and `Pending confirmations` inbox. Allow confirmation or dispute through the website; Discord notification/actions can be added when accounts are linked.
10. On valid acceptance, finalize and update casual and career statistics. Never add seasonal LP/MMR for a casual game.

### B2. Standalone Ranked match report

Use the **same form and match lifecycle**, with stronger requirements:

- Both players must be authenticated, eligible for ranked play, and identifiable; propose whether Discord linking is optional or required for web-only players.
- Ranked season active at the official match time; define start/end in a configurable timezone and UTC storage.
- Require explicit opponent confirmation before any ranking impact, never trust a user-declared result as final.
- Use the final approved `FinalizedRatedMatch` contract from Feature 01; **do not create a temporary Elo algorithm**. The initial UI can show `Rating update pending integration` if Feature 01 has not been implemented.
- Validate mode changes and game type server-side; once reported, prohibit silent flipping between Casual/Ranked.
- Address repeated head-to-head games and potential collusion: audit, flag, configurable policy, no automatic unjustified bans.
- Preserve a record of the MMR/LP update, if and when applied, linked by unique match ID.

### B3. Tournament match reporting on website

Investigate existing game cards and `időpontfoglaló` workflow. Provide a `Report result` action for the **existing scheduled fixture**, ideally on the match card:

- Preselect, then lock where appropriate, the tournament ID, fixture/round ID and two registered participants.
- Follow existing admin/player-confirmation policy; do not allow unrelated website users to claim this match.
- Prefill hero choices if already fixed for the fixture; otherwise allow confirmed choices per tournament rules.
- Reuse game result fields and validation and preserve the Swiss standings workflow.
- Define if the tournament match also counts toward career stats and ranked rating; **the same canonical match should apply each eligible effect only once**.
- Ensure a result entered by Discord for this fixture is reconciled with the existing canonical fixture rather than duplicated.
- Distinguish rounds already finalized, forfeits, byes and unplayed/cancelled fixtures. A bye is not a competitive played game and must not create fictional match/hero stats or rated MMR changes.
- Preserve tournament score rules (e.g. win=3, draw=1, loss=0 where configured) separately from rating outcome scores (e.g. win=1, draw=0.5, loss=0).

### B4. Review and disputes

Design a usable opponent confirmation inbox in Hungarian:

- `Elfogadásra váró meccsek` / pending opponent confirmations.
- Match detail page with both player identities, heroes, final HP, ultimates, match type, who reported it, timestamp, and winner/draw.
- Two clear actions: `Elfogadom` (accept) and `Vitatom` (dispute); optionally a correction request, with proposal for whether disputes create a new revision or trigger moderator review.
- Explicit notifications and outcomes when a request is rejected, expires, is cancelled, corrected, or finalized.
- Ensure only the true opponent can accept through their logged-in profile; linked Discord buttons must verify the same stable user identity.
- Admin correction/override only with permission checks, documented reasons, and audit history.

## C. Canonical match domain model

Recommend a simple extensible domain model after inspecting what already exists.

**Keep these independent concepts separate:**

- **Source channel:** `WEB`, `DISCORD`, or authorized admin/integration; captures where the request originated.
- **Match context:** `CASUAL`, `RANKED`, `TOURNAMENT`. Tournament can optionally have a **rated eligibility flag**, rather than requiring a second independent ranked game entry.
- **Tournament reference:** nullable but unique official fixture/round ID when applicable.
- **Match status:** for example `PENDING_CONFIRMATION`, `FINALIZED`, `DISPUTED`, `REJECTED`, `CANCELLED`, `EXPIRED`, `VOIDED` (choose actual states after auditing); include transition rules and who can execute them.
- **Outcome:** winner/loser/draw/valid special outcomes; distinguish played result from admin no-show or forfeit semantics.
- **Participant stats:** hero ID, final HP (if applicable), ultimates, optional notes; canonical player order must not affect calculations.
- **Eligibility:** separate eligibility rules for career stats, casual/ranked record, tournament standings, season LP and permanent skill. Explain each with a matrix.
- **Identity and evidence:** linked stable player IDs, reporter identity, who confirmed/disputed, source message/interaction IDs and action timestamps.
- **Integrity:** idempotency key, unique fixture association, revision/audit history, applied calculation/event IDs.

Reuse existing models where safe rather than inventing redundant `discord_matches`, `website_matches`, `tournament_results` tables for the same actual game.

Propose a **single authoritative match state machine**, including who can trigger transitions, what is immutable, revision behavior, and exactly which transitions enqueue/apply stats and rating effects.

## D. Backend and database design

- Specify website-side API/server actions for creating a pending report, listing mine, listing incoming, detail, confirm, dispute, cancel, correct, and listing player history. Prefer shared domain operations for browser and Discord adapters.
- Design Supabase table changes, constraints, RLS authorization, indexes and migrations based on verified schema. Prevent impersonation and unauthorized status/ratings mutations.
- The browser may only send inputs authorized for the logged-in user. It must never supply trusted reporter IDs, privileged official-match flags, finalized status, LP changes or arbitrary opponent approval.
- Discord bot calls should pass through a narrowly scoped authenticated backend integration, not duplicate database-side status transitions.
- Ensure atomic/transactional exactly-once finalization. Consider concurrent Discord/website approvals, retries, browser double-clicks, duplicate webhook delivery, and database failures.
- Maintain either derived statistics from finalized canonical matches or safe cached/materialized aggregates with a documented reconciliation method. Avoid divergent counters.
- Provide an immutable/auditable `match_finalized`/rating ledger or existing equivalent and a deterministic rebuild or reversal strategy for corrected historical matches (Glicko-2 revisions may require replaying later rating periods).
- Protect against duplicates across sources, including two players submitting the same result simultaneously. Different real games between the same pair must remain representable; **do not simply ban all repeated opponents**.
- Define match timestamp policy (`played_at`, `submitted_at`, `confirmed_at`, `finalized_at`) and which timestamp determines ranking season. Handle submissions straddling June 30/July 1 or December 31/January 1 and prevent abusive backdating.
- Define outbox/job/notification patterns and failure/retry semantics where they materially improve consistency. Avoid unnecessary infrastructure.
- Design player identity linking between website account ID and Discord user ID without relying on nicknames.
- Do not allow secrets, service-role tokens, or unrestricted game mutations in the browser bundle.

## E. Website UI integration

Propose specific routes/navigation based on actual website conventions (do not invent existing routes). Include:

1. **Report Match** page or modal with casual/ranked mode; responsive form with hero search/select and clear validation.
2. **Match preview** and success state with a stable pending-report URL.
3. **Pending confirmation inbox** with unread/pending count, details and accept/dispute actions.
4. **My matches** and profile match-history list with mode and confirmation status badges; pending entries distinguishable from official results.
5. **Player profile statistics**, split by casual, ranked, tournament and all-time; explain how tournaments rated for global skill avoid duplicate counters.
6. **Tournament match card** integration with prefilled fixture reporting and existing approval flow.
7. Optional confirmation notifications in website UI and Discord (when linked), consistent status across clients.
8. Hungarian text and responsive mobile-first behavior matching the existing design; accessibility, keyboard handling and error messages.

Do not use static example heroes, fake stats or arbitrary fake match IDs in actual business logic. Reuse database hero definitions and profile data.

## F. Match metrics, standings, and integration with planned ranking

Produce an exact proposed eligibility/aggregation matrix for these cases:

| Situation | Official career stats? | Seasonal MMR/LP? | Tournament standings? |
|---|---|---|---|
| Verified standalone casual game | Yes | No | No |
| Verified standalone ranked game | Yes | Yes, once when rating engine exists | No |
| Confirmed played tournament game | Yes | Only if tournament is explicitly rating-eligible, once | Yes |
| Pending/disputed/declined report | No | No | No |
| Allocated bye/no played game | No played-game stats | No | Tournament-specific bye points only |
| Voided/corrected result | Recompute/reconcile | Reverse/replay as required | Recompute/reconcile |

This is a recommended starting matrix; compare it with the live tournament's existing policy and explicitly call out deviations.

Define how stats treat wins, losses, draws, concessions, remaining HP, ultimate usage, hero-specific stats, head-to-head and tournament performance. Avoid deriving wins solely from HP.

The **ranking feature is a separate planned project**: don't quietly create a second ELO/MMR implementation. Design the event contract so the approved algorithm can be added later with no data migrations needed for every new ingestion source.

## G. Edge cases and abuse prevention

Include clear policies for:

- Opponent has no website account, is inactive, or has not linked Discord.
- Self-opponent, wrong opponent selected, duplicate account, invalid hero or inconsistent/negative HP.
- Multiple pending submissions for the same claimed game and legitimate multiple games on the same day.
- Opponent ignores confirmation or disputes it; notification failure; offline website/Discord.
- Both players submit contradictory results and one confirms before the other; conflicting games/roles.
- Reporter attempts to change match type after submitting, force acceptance or backdate results to a prior season.
- User reports a tournament game as separate Casual/Ranked game to farm rewards.
- Invalid/tampered client inputs, RLS bypass attempts, bot auth/replay attacks.
- Concession, no-show, draw, double knockout, zero health with special rules, and lack of reliable remaining HP information.
- A user loses access after reporting; identity and audit consistency.
- Admin reverses/corrects a previously rated match; historical rating period replay and seasonal snapshots.
- Privacy of profile data, report evidence, and public pending matches.

## H. Implementation sequencing and tests (proposal only)

Suggest an incremental release and identify hard dependencies on the other two feature plans.

Candidate sequence:

1. Normalize/unify canonical match record and state machine, identity mapping, secure backend endpoints; migrate existing records carefully without implying historic games were verified.
2. Build website Casual result reporting and opponent confirmation, with reliable official profile/career stats.
3. Add website Ranked reporting as a verified match type, with a rating-event contract but no temporary Elo; add approved ranking engine once Feature 01 is implemented.
4. Integrate tournament fixture reporting with existing validation and Swiss results.
5. Connect Discord `/result` to the same APIs and status workflow (Feature 02), then retire/reconcile legacy JSON/reaction result reporting.
6. Add comprehensive admin correction, moderation, notifications, operational monitoring and reconciliation.

Design tests for form validation, identity and authorization, pending/no-count guarantee, two-party approval, concurrent acceptance, idempotent stat/rating application, duplicate sources, genuine repeated games, rated vs casual eligibility, tournament dedup, byes and forfeits, correction and rating replay, season rollover, browser/mobile UI, RLS, regressions to Swiss standings and existing bot commands.

Do not claim test coverage or browser success unless actually verified.

## I. Deliverables: STOP after proposal

Provide:

1. **Verified as-is architecture** with exact code paths, relevant functions, database objects and permission rules.
2. **Unified match system recommendation** with a state diagram and event flow for web, Discord and tournament fixtures.
3. **Detailed user journeys and UI component/route map** for report, pending inbox, acceptance, dispute, history and fixture reporting.
4. **Proposed schema and migration plan** emphasizing reuse and historical data preservation.
5. **Exact server API and RLS design**, including actor verification, match validation and idempotent finalization.
6. **Integration contracts** to Feature 01's seasonal rank/Glicko-2 and Feature 02's Discord command/spectating, without duplicate implementations.
7. **Stats eligibility matrix** and key product choices to approve.
8. **Ordered, file-by-file implementation plan**, with minimum viable version and later enhancements.
9. **Risks and test plan** covering concurrency, abuse, corrections, tournament regressions, season boundaries.
10. **Open decisions** and a reasoned recommended default for each, labeling findings separately from proposals.

**Do not implement, migrate, commit, push or deploy. End after the Phase 1 report and ask for explicit approval to proceed.**

---

## Recommended product decisions for the project owner

- **One canonical match model** for all sources, not separate Discord and website statistics.
- **Submission is never finalization.** Only an authenticated opponent or defined tournament-admin workflow can confirm the outcome.
- **Casual / Ranked / Tournament is context; Web / Discord is submission source.** Tournament ranked-eligibility is an independent property.
- **No rating until approved rating engine exists.** Match verification can launch first.
- **No duplicate tournament results**: the match result always attaches to the existing pairing/fixture.
- **No automatic wins from missing acceptance**, including an arbitrary one-hour timeout.
- **Both players should be able to see one permanent canonical match URL**, with an auditable report history.
- **Website users should not be forced to use Discord** to report or confirm matches if a secure website identity exists, unless the community explicitly chooses that rule.
