# Meccsszervező (match organizer)

| | |
|---|---|
| Folder | `src/features/match-organizer/` |
| Branch | `feature/match-organizer` for bigger work; small fixes as `fix/<name>` from `main` |
| Route | `/meccsszervezo` (pages in `src/app/meccsszervezo/`) |
| Status | **live** |

The production feature: players find their opponent, agree on a match time, mark it played;
admins import Karnyx rounds, swap players, send reminders. Discord posts and calendar feeds.

**Read [docs/match-organizer.md](../../../docs/match-organizer.md) before changing it:** architecture,
data model, Discord messages and the domain rules agreed with the owner.

```
actions/      server actions (match, admin, profile): permission check first, then write
components/   MatchList (rows), MatchupGrid (tiles), RoundTimeline, SlotPicker, ImportForm, …
lib/          pure logic + data access (karnyx parser, notify texts, time, schedule, swap, …)
              with unit tests next to the files
```
