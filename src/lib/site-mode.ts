// Launch phases (see STATE.md → "Launch plan").
//
// Phase 1 (default): only the Meccsszervező is public. Every other page redirects to it.
// Phase 2: NEXT_PUBLIC_FULL_SITE=1 opens the whole site (news, rankings, shop, …) around it.
//
// NEXT_PUBLIC_* values are baked in at build time: change it in Vercel, then redeploy.
// Locally, put NEXT_PUBLIC_FULL_SITE=1 in .env.local to work on the hidden pages.

export const FULL_SITE = process.env.NEXT_PUBLIC_FULL_SITE === "1";

/** Paths that are public in phase 1. Everything else redirects to the Meccsszervező. */
export const PHASE1_PUBLIC_PREFIXES = ["/meccsszervezo", "/auth", "/api"];

export function isPublicInPhase1(pathname: string): boolean {
  return PHASE1_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
