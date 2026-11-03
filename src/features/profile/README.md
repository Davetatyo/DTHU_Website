# Profil (profile pictures, admin profile editing, bans)

| | |
|---|---|
| Folder | `src/features/profile/` |
| Branch | `feature/profile` |
| Roadmap | R3 (Profile page upgrade) in `Features_Roadmap.md`: the avatar part |
| Pages | `/meccsszervezo/profil` (Profilom), `/meccsszervezo/admin/felhasznalo/<id>` (admin "Profil szerkesztése") |
| Database | `supabase/migrations/0002_profile_avatars_and_bans.sql` (run by the owner before deploying) |
| Status | **live** (v2.1, 2026-11-02); uploads open to every logged-in user since v2.2 (`AVATAR_TEST_MODE = false`) |

## What it does

**Profile pictures.** On Profilom the user picks a photo, moves and zooms it inside a round
frame (`react-easy-crop`), and on "Mentés" the browser cuts out the square, shrinks it to
512×512 px and compresses it to WebP (JPEG on browsers that can't encode WebP), at most
300 KB. Only that small file is uploaded. "Csere" replaces it, "Törlés" goes back to the
default icon.

The picture replaces the hero artwork wherever a player avatar shows: header pill, match rows,
matchup grid, match page, Hírek, Ranglista. Players without a picture keep the hero artwork.

**Admin: Profil szerkesztése** (the old "Karnyx név szerkesztése" page): Karnyx name, Facebook
name, time zone, remove or replace the picture, and ban.

**Ban** (two clicks: "Kitiltás", then "Igen, kitiltom"): the profile row stays, marked
`banned_at`, so the ban sticks to the Discord account. The Supabase Auth user is banned too
(no new logins or session refreshes), the middleware logs the user out on their next page
load, and `getCurrentProfile` treats them as logged out. Their picture is deleted; matches,
roster and Karnyx name are untouched. Admins and the owner can't be banned (remove the admin
role first); nobody can ban themselves. "Tiltás feloldása" lifts it.

**Admin badge try-on** (testing, v2.23): on Profilom, admins see "Jelvények · admin teszt":
every badge in `public/badges/` (level badges and the podium sets), each previewed with their
own picture and a "Felveszem" button. The worn badge shows on their header chip and at the top
of that block; "Leveszem" takes it off. The choice is a cookie (`teszt_jelveny`) in that
admin's browser, not a database row, and it is only drawn for the signed-in visitor themself
when they are a real admin. So players and other admins never see it, and nothing is
written to the database. The real collection (Gyűjtemény, roadmap R3/R4) replaces this later.

## Code

- `lib/avatar.ts`: sizes and limits, file-format check by magic bytes, storage paths (pure,
  browser-safe). `lib/access.ts`: `AVATAR_TEST_MODE` and who may upload.
- `lib/avatar-store.ts`: storage reads/writes (service role) and the Karnyx name → picture
  map used by `components/PlayerAvatar`.
- `lib/ban.ts`: who may be banned.
- `lib/badges.ts` (+ tests): the badge catalogue (podium sets × gold/silver/bronze and level
  badges, files and hole sizes) and `badgeBoxSize()`. `lib/test-badge.ts`: the try-on cookie,
  read only for admins. `actions/badge.ts`: `setTestBadge` (admins only).
- `components/BadgedAvatar.tsx` (picture + ring, sized from the picture), `HeaderBadge.tsx`
  (`headerBadge()`, passed by the layouts to `SiteHeader` as `userBadge`),
  `AdminBadgePicker.tsx` (the Profilom block). Styles in `badges.css`.
- `actions/avatar.ts`, `actions/ban.ts`: server actions, permission checks first.
- `components/AvatarEditor.tsx` (client: pick, crop, upload), `components/PlayerAvatar.tsx`
  (server: avatar with picture lookup), `components/BanButton.tsx` (client: two-step ban).
- Site-wide: `src/lib/avatar-url.ts` (bucket and public URL, also used by the header),
  `src/lib/image-crop.ts` (browser crop and compress, reusable for news/event pictures).

## Storage

Bucket `avatars`, public read (the URL contains the user's random ID), writes only through the
server. Files: `<user id>/<timestamp>.webp`, a new name on every upload so caches never show an
old picture; the previous file is deleted.

## Test phase switch

`AVATAR_TEST_MODE` in `lib/access.ts`: `true` limits uploads to the owner (used for the first
live test), `false` (current) lets every logged-in user upload.

## Open questions

- Badge ring around the picture (R3/R4): goes into `HeroAvatar` when cosmetics exist.
