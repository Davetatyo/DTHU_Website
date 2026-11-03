# Szabálytár

| | |
|---|---|
| Folder | `src/features/rulebook/` |
| Branch | `feature/rulebook` |
| Route | `/szabalytar` (pages in `src/app/(site)/szabalytar/`, popup data in `src/app/api/szabalytar/`) |
| Status | **preview**: admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md). Roadmap: R10 |

## What it is

The owner's Hungarian RulePop (https://dice-throne-rulepop-hu.vercel.app/, his translation of
https://dice-throne.rulepop.com/) inside the site, in our design: the same content and the same
way of using it, not a rewrite. Owner decisions (2026-11-03): popups like RulePop, every entry
has its own link; Adventures and Marvel co-op are left out; no Visszajelzés, no admin editing
(content is edited in the repository), no download/app install; the old RulePop HU site stays
online after the Szabálytár goes public.

## How it works

- **Content** (`content/`): one HTML file per entry in RulePop's own markup, imported once by
  `scripts/rulebook/import-rulepop.mjs` (don't re-run it: it would overwrite every edit).
  `content/rules/<id>.html` are RulePop's sections, `content/hero/<id>.html` and
  `content/token/<id>.html` its hero and token pages. Each starts with
  `<h2 slot="header">Title</h2>` and optionally `<ul slot="header" class="see-also">`. Links stay
  in RulePop form (`href="#setup"`, `#hero/barbarian`, `#token/burn`); pictures are in
  `public/szabalytar/img/`, icons in `public/szabalytar/sprites.svg` (`<use href="#se-burn"/>`).
- **Addresses** (`lib/pages.ts`): RulePop id → Hungarian slug (`setup` → `/szabalytar/elokeszites`),
  heroes at `/szabalytar/hosok/<id>`, tokens at `/szabalytar/tokenek/<id>`; the start page's two
  button groups; redirects for the old preview addresses (the Alchemist still links them).
- **Rendering** (`lib/render.ts`, `lib/content.ts`): splits off title and "see also", turns
  `#id` links into our URLs (links to pages that don't exist yet become plain text,
  `span.rp-missing`), and applies RulePop's "dynamic rules" (`data-relevance`, e.g. the game
  mode switch on Körök, the FAQ categories) in their default state.
- **Popups** (`components/RulebookViewer.tsx`): a click on any entry link opens it over the page
  and puts its own link in the address bar; back/forward and the close button work like
  RulePop. The popup reads a static JSON file (`/api/szabalytar/<path>`, built at deploy time,
  outside the middleware). A shared link opens the full page (`[...path]/page.tsx`).
- **Styles**: `rulepop.css` (RulePop's content styles scoped to `.rp`, on our colours; icon
  colours and figure layouts copied unchanged).

## Editing content

Edit the HTML file, keep RulePop's markup. To add a page: add the file, and for a section
(`content/rules/`) an entry in `RULE_PAGES`. `npm test` checks every file renders, that no
link is broken, and lists (snapshot) the link targets still without a page.

## Phases (roadmap R10)

1. ✅ Import, start page, rule/hero/token popups and pages.
2. Heroes and tokens lists: done with phase 1 (they are RulePop sections).
3. Search and Tárgymutató (index).
4. Settings: hero filter (RulePop's "Szűrő beállítások"), remembered on the device.
5. Missing content from the current rulepop.com, translated in the style of the existing
   pages. ✅ The 5 newer heroes (Druida, Párbajhős, Kovácsmester, Misztikus Bunyós, Nap-tündér)
   and their 13 tokens, with their icons (added to `sprites.svg`) and pictures; names and
   wording to be reviewed by the owner. Still to do: ~20 core pages (the snapshot in
   `lib/content.test.ts`) and a few changed pages.
6. Update checker (diff against a stored copy of rulepop.com), final checks.

## Known gaps

- The Alchemist still answers from the old prototype summary in `data/` (its links redirect to
  the new pages). Moving it onto `content/` is a separate task.
