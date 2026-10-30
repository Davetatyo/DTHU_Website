# Karnyx (admin tool)

| | |
|---|---|
| Folder | `src/features/karnyx/` |
| Branch | `feature/karnyx` |
| Route | `/karnyx` (page in `src/app/(site)/karnyx/`) |
| Status | **preview**, **admin-only in every phase** (`adminOnly` in the registry; middleware blocks `/karnyx` for everyone else) |

## What it is

The admins' door to [Karnyx](https://karnyx.app/), where pairings and results are kept. Goal:
get a new round's pairings into the Meccsszervező without copy-paste.

## What's built

`/karnyx` page with a launcher: opens Karnyx in a separate window (or a new tab).

## Why not an embedded frame

- karnyx.app answers with `X-Frame-Options: SAMEORIGIN` (checked 2026-10-30), so browsers
  refuse to show it inside any other site. Nothing on our side can change that.
- Even where framing is allowed, the browser's same-origin policy stops our page from reading
  what's inside another site's frame, so a script on dthu.hu could not read the tournament page.
- Proxying Karnyx through our server to get around this would mean handling admins' Karnyx
  logins on our server: not acceptable.

## Import experiment (next)

A script can only read the tournament page when it runs **on karnyx.app**, in the admin's own
logged-in browser tab. Candidates, in order of effort:

1. **Bookmarklet**: a "DTHU import" bookmark the admin clicks on the Karnyx tournament page; it
   reads the pairings from the page (or from the JSON the page itself loads) and copies them in
   the format the Admin felület import expects, or opens our import form pre-filled.
2. **Browser extension**: the same, with a button; more setup, same idea.

Open questions: what the tournament page contains (rendered HTML or a JSON API call), whether
Karnyx's terms allow it (ask the Karnyx developers; a public share link or API would be best).
