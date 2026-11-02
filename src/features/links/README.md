# Linkek

| | |
|---|---|
| Folder | `src/features/links/` |
| Branch | `feature/links` |
| Roadmap | R9 (Linkek managed by admins) |
| Routes | `/linkek` (tiles); admin: `/meccsszervezo/admin/linkek` (list + order), `…/uj` (new), `…/<id>` (edit) |
| Database | `supabase/migrations/0006_links.sql`: table `links` (with the four former links), storage bucket `link-images` |
| Status | **preview**: admins only until the full site opens |

## What it does

The Linkek page shows the community links as tiles (Discord, Facebook group, Karnyx, the
official Dice Throne site …), each opening in a new tab: name, optional short description,
optional picture (otherwise a gold gradient with a link icon).

Admins (every admin) manage them under Admin felület → "Linkek kezelése" (under the
Eseménynaptár card): **Új link** (name, address, short description; goes to the end and shows
at once), edit, picture (cropped to 16:9 in the browser, saved at once), "Látható" switch to
hide a link without deleting it, ↑ / ↓ to reorder, delete (with confirmation). Deliberately
simple: no drafts or scheduling (owner, 2026-11-03).

## Code

- `lib/links.ts` (pure, tested): the form (http(s) addresses only) and ordering.
- `lib/links-data.ts` (server), `actions/links.ts` (admin only).
- `components/LinkTile.tsx`, `components/LinkFormFields.tsx`.
- Shared: `CoverEditor` (`src/components/content/`), `src/lib/content-images.ts`.
