# Regisztráció (registration guide)

| | |
|---|---|
| Folder | `src/features/register-page/` |
| Branch | `feature/register-page` |
| Route | `/meccsszervezo/regisztracio` (pages in `src/app/meccsszervezo/regisztracio/page.tsx`) |
| Status | **live**: accessible by everyone inside the Meccsszervező |

## What it is

A landing page that explains step by step how to register and use the Meccsszervező (match
organizer). First-time visitors see clear cards explaining each registration step (Discord login,
profile setup, Karnyx name, scheduling a match). The page also links to a client-side onboarding
overlay that highlights key UI elements for new users.

## What's built

- Registration guide page with hero banner, 4-step cards, and a "how it works" section.
- `OnboardingOverlay` client component: first-time users see pop-up explanation cards on the
  Meccsszervező overview page. Dismissed state is stored in `localStorage`.

## Design

Uses the site's design system (globals.css tokens) — dark esports look with gold accents.
Step cards use the `.card` / `.panel3` classes. The onboarding overlay uses tooltips similar to
the existing `InfoTip` pattern.

## Folder layout

See [`../_template/README.md`](../_template/README.md).
