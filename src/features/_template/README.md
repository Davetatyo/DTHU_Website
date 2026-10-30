# Feature template

Copy this folder to `src/features/<id>/` to start a feature (id = kebab-case, same as the
branch `feature/<id>`). Then:

1. Write the feature's README from the sections below.
2. Add (or update) its entry in `src/features/registry.ts` (label, route, status).
3. Add its paths to `src/lib/routes.ts`; never write literal paths in pages.
4. Build pages under `src/app/(site)/<route>/` (or its own sub site like
   `src/app/meccsszervezo/` if it needs its own shell).
5. Add a row (or update it) in STATE.md → Features.

## Folder layout

```
src/features/<id>/
  README.md        scope, route, status, data, open questions
  lib/             pure logic and data access (*.ts), unit tests next to them (*.test.ts)
  components/      React components used by the feature's pages (server by default;
                   "use client" only where needed)
  actions/         server actions ("use server"): check permission first, then write
  data/            static content (texts, lists) when the feature has no database table
```

Create only the folders you need. Pages stay thin: load data, render components.

## Rules

- Imports: a feature may import `@/lib/*`, `@/components/*`, and another feature's exported
  `components/` or `lib/` (never its pages or actions). `@/lib` and `@/components` must not
  import from features.
- Database tables: new numbered migration in `supabase/migrations/`, applied by the owner
  before the code ships (record it in STATE.md as a manual step).
- Hungarian UI text, English code. Design: classes and tokens from `src/app/globals.css`;
  the prototype in `reference/artifact` shows how each feature should look.
