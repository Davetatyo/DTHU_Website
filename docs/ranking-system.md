# Dice Throne Hungary: Competitive Ranking System Architecture and Implementation

You are acting as a senior software architect, competitive ranking-system designer, database architect, and full-stack engineer.

We are building a competitive ranking system for the existing Dice Throne Hungary website.

I want a professional ranking experience inspired by League of Legends, with seasonal tiers and LP progression, a mathematically sound skill-rating system, and permanent career statistics.

**CRITICAL: Do not immediately implement anything. First investigate the existing codebase, explain what is already there, and produce a detailed, feasible implementation proposal. Wait for my approval before making code changes.**

## 1. Understand the existing project

Explore the entire relevant codebase, including:

- README.md and STATE.md, if present.
- Current framework, project structure, routing, authentication, authorization, and player profiles.
- Supabase schema, migrations, RLS policies, and server-side operations.
- Tournament creation, registration, scheduling, Swiss pairing, and result management.
- The existing standings calculation, including standings.ts.
- Tournament points, Buchholz, HP difference, byes, withdrawals, forfeits, and draws.
- Existing match history, hero/character tracking, and statistical data.
- Admin interfaces, current leaderboard pages, and reusable UI components.
- Existing tests and CI/CD processes.

The website currently supports Swiss tournaments. One known configuration awards 3 points for a win, 1 for a draw, and 0 for a loss. The Swiss system uses Full Buchholz and HP difference for standings.

**Do not break or replace the current Swiss tournament system.**

Identify which tournament results could be integrated into the new competitive ranking system and which missing data or workflows would need to be added.

Do not assume that every recorded match is a valid ranked match.

## 2. Design three separate ranking systems

### A. Seasonal Ranked League

Create a six-month seasonal competitive ladder with:

- Bronze, Silver, Gold, Platinum, Diamond, Master, and optionally Challenger.
- Divisions II and I for regular tiers, initially proposed.
- League Points (LP).
- Promotions and demotions.
- Five placement matches.
- Seasonal leaderboards.
- Current rank and peak seasonal rank.
- Rank progression history.
- Seasonal statistics and achievements.
- Season-end snapshots and past-season browsing.

Proposed seasons:

- Season 1: January 1 through June 30.
- Season 2: July 1 through December 31.
- Repeat every year.

Use Europe/Budapest as the proposed competition timezone, subject to existing project configuration.

The next full season can begin January 1, 2027. Investigate how to handle existing 2026 records without silently rewriting historical results.

At season end:

- Finalize the standings.
- Save each player's final rank, peak rank, LP, match record, and achievements.
- Preserve historical seasonal leaderboards.
- Start the next season with a soft reset of visible progression.
- Preserve underlying player skill and all-time statistics.
- Make season transitions atomic and idempotent.

Propose a fair placement and soft-reset policy.

### B. Permanent Skill Rating

Investigate Glicko-2 as the preferred skill-rating algorithm.

Compare Glicko-2 against Elo and TrueSkill in the context of a smaller, potentially low-activity, one-versus-one board-game community.

Explain the advantages, disadvantages, and implementation complexity.

For Glicko-2, consider:

- Starting rating of 1500.
- Starting rating deviation of 350.
- Starting volatility of 0.06.
- An initially proposed tau of 0.5.
- Rating periods and how to handle multiple tournament games.
- Inactivity and increasing rating uncertainty.
- Expected results against differently rated opponents.
- Wins, losses, and draws.
- Deterministic historical recalculation after corrected match results.

These are starting parameters for evaluation, not immutable requirements.

Use published mathematical specifications and verified libraries where appropriate. Do not invent a simplified algorithm and call it Glicko-2.

Investigate how Riot Games' hidden MMR and visible LP are conceptually connected.

Design an understandable LP algorithm that considers:

- Match outcome.
- Expected probability of winning.
- Difference between underlying skill and visible rank.
- Placement uncertainty.
- Promotion and demotion behavior.
- Reasonable LP gain/loss bounds.
- The limited match volume of a board-game community.

For similarly matched established players, consider approximately +20/-20 LP as a starting reference, then calibrate using simulations.

Do not arbitrarily copy League's progression thresholds if they would require an unrealistic number of matches in a six-month Dice Throne season.

A win should increase the winning player's rating and a loss should decrease the losing player's rating under normal conditions, subject to the chosen algorithm.

HP margin must not directly increase skill rating.

### C. Permanent All-Time Leaderboard

Create an all-time competitive leaderboard that never resets with the seasons.

It should NOT use Bronze/Silver/Gold tiers.

Investigate sorting eligible players using a conservative skill estimate such as:

Career Skill Score = Glicko rating - 2 × rating deviation.

Propose a configurable minimum number of verified competitive matches before a player receives an official all-time position.

Keep the following statistics permanently:

- Total games, wins, losses, draws.
- Overall win rate.
- Ranked versus casual versus tournament statistics.
- Tournament participations, victories, and podium finishes.
- Lifetime skill-rating history.
- Best historical rating.
- Highest seasonal rank achieved.
- Win and loss streaks.
- Hero usage and hero-specific performance, if the data model supports it.
- Average and total HP difference, where meaningful.
- Head-to-head records.
- Season-by-season performance.

Statistics should be traceable to actual finalized match records.

Offer additional leaderboard sorting options, but do not use raw win rate as the only official measure of skill.

## 3. Define match eligibility and integrity

Investigate how matches are currently recorded and verified.

Propose an explicit policy for which results affect skill and seasonal LP.

Requirements:

- An official eligible 1v1 tournament game may count as one rated match.
- The tournament's final placement must not award an additional duplicate skill-rating change.
- Casual games must not affect competitive rating unless intentionally designated as ranked.
- Byes must not count as played matches or award skill rating.
- Draws must be supported by the rating algorithm.
- Concessions, no-shows, administrative forfeits, cancellations, and disputed results must have clearly documented policies.
- Repeated submissions must not award points twice.
- A corrected or deleted historical result must be handled safely.
- Prevent obvious rating farming and win-trading.
- Never allow clients to directly update LP or skill ratings.
- Respect authentication, permissions, Supabase RLS, and admin authority.

If the website lacks standalone ranked-match registration, propose a secure workflow where both players confirm results or an authorized tournament admin validates them.

Preserve the existing tournament pairing behavior. Swiss opponents are selected based on tournament rules, not seasonal LP.

## 4. Database architecture

Inspect the existing schema before recommending changes.

Propose the smallest maintainable extension that supports:

- Ranking seasons.
- Permanent player rating state.
- Historical rating updates and an auditable event ledger.
- Per-season player progression.
- Seasonal leaderboard snapshots.
- Verified match eligibility and deduplication.
- Career statistics, calculated or cached appropriately.
- Rank history and season achievements.

Explain whether existing tables should be reused rather than duplicated.

Provide proposed tables, important columns, foreign keys, indexes, unique constraints, RLS rules, and migration strategy.

Historical records must remain intact.

All rating updates must be deterministic, transactionally safe, replayable, and resistant to concurrent double processing.

## 5. Website UX and design

Inspect the existing visual design and navigation.

Propose a modern Dice Throne ranking experience consistent with the current website, rather than copying League of Legends artwork.

Include:

**Seasonal leaderboard:** rank badge, player name, LP, division, wins/losses, win rate, current season, and previous-season selector.

**All-time leaderboard:** overall position, career skill score, lifetime games, victories, win rate, and expandable performance statistics.

**Player profile:** current seasonal rank, LP progress, career stats, match history, rating development, favorite heroes, seasonal history, and earned achievements.

**Match result screen:** display changes in LP and rank progression after a verified ranked game, with an understandable explanation.

**Admin interface:** season configuration, eligibility rules, historical recalculation tools, and audit logs for result corrections.

Use Hungarian as the primary user-facing language, following the website's existing localization approach.

The interface must work well on mobile and desktop.

Rank badges should use original, Dice Throne-themed artwork and should not copy Riot's protected visual assets.

## 6. Simulations and mathematical validation

Before choosing final thresholds, simulate realistic player communities.

Test populations of approximately 20, 50, 100, and 250 players, including:

- Beginners.
- Highly experienced players.
- Inactive players returning after months.
- Players with only 5–10 matches per season.
- Very active players.
- Players repeatedly facing the same opponent.
- Upsets and long winning or losing streaks.
- Unbalanced matchmaking.
- Draw-heavy tournaments.
- Matches around season boundaries.

Evaluate rating stability, prediction quality, progression speed, rank distribution, inflation, and whether high ranks are achievable without excessive grinding.

Suggest initial settings that are fair for a small board-game community, and which parameters should remain configurable.

## 7. Testing requirements

The eventual implementation must cover:

- Glicko-2 calculations against published reference examples.
- Correct rating-period handling.
- LP gains/losses and promotions.
- Placement matches.
- Season reset and historical snapshots.
- All-time statistics remaining intact after a reset.
- Ranked match eligibility.
- Draws, concessions, no-shows, and byes.
- Duplicate result submissions.
- Historical result corrections.
- Concurrent result finalization.
- Correct leaderboard ordering.
- New players and inactivity.
- Authorization and Supabase RLS.
- Existing Swiss tournament behavior remaining unchanged.

Do not report tests as passing unless they were actually executed.

## 8. Deliverables for Phase 1

Do not modify the project yet.

Produce:

1. **Current architecture findings:** exact files, routes, components, database tables, and relevant existing functions.
2. **Recommended architecture:** explain the three ranking systems and how they communicate.
3. **Mathematical specification:** selected rating algorithm, LP rules, placements, resets, and eligibility.
4. **Database migration proposal:** concrete schema changes.
5. **Frontend proposal:** pages, components, navigation, and player profile changes.
6. **Implementation plan:** ordered development phases with files to create or modify.
7. **Risk assessment:** backward compatibility, existing tournament data, fairness, abuse prevention, and operational concerns.
8. **Testing plan:** exact tests, edge cases, and validation methodology.
9. **Decisions requiring my approval:** identify alternatives where community policy matters.

Explain your findings clearly and challenge any of my assumptions that would make the system unfair or difficult to maintain.

Favor a production-quality but manageable solution over unnecessary complexity.

**Stop after Phase 1 and ask for approval.**

## 9. Phase 2, only after approval

After I approve the architecture, implement the agreed design incrementally.

Use the existing project conventions, authentication system, components, and database infrastructure.

Add migrations, domain logic, backend operations, frontend pages, automated tests, and documentation.

Maintain the existing functionality throughout development.

Run type checks, linting, automated tests, and available browser tests. Verify the ranked, all-time, and player-profile screens against a local Supabase database if the environment is available.

Provide a summary of files changed, migrations, tests executed, and any remaining limitations.

Do not commit, push, deploy, or modify production data without my explicit approval.

**The goal is a trustworthy competitive ranking system that encourages Dice Throne players to participate over many seasons, while fairly measuring skill and preserving their lifetime achievements.**