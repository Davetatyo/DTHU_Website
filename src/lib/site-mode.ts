// Launch phases (see STATE.md → "Launch plan").
//
// Phase 1 (default): the public sees only the Meccsszervező. The rest of the site is built and
// deployed, but only admins see it (developer preview, with a banner saying so).
// Phase 2: NEXT_PUBLIC_FULL_SITE=1 opens the whole site to everyone.
//
// NEXT_PUBLIC_* values are baked in at build time: change it in Vercel, then redeploy.

export const FULL_SITE = process.env.NEXT_PUBLIC_FULL_SITE === "1";

/** Paths that are public in phase 1. Everything else is admin-only until the full site opens. */
export const PHASE1_PUBLIC_PREFIXES = ["/regisztracio", "/auth", "/api"];

/** Paths that any logged-in user can see in phase 1 (not just admins). */
export const PHASE1_LOGIN_PREFIXES = ["/meccsszervezo"];

export function isPublicInPhase1(pathname: string): boolean {
  return PHASE1_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isLoginGatedInPhase1(pathname: string): boolean {
  return PHASE1_LOGIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Where a hidden page sends visitors who can't see it in phase 1. Old /gyik links meant the Meccsszervező FAQ. */
export function phase1Fallback(pathname: string): string {
  return pathname === "/gyik" ? "/meccsszervezo/gyik" : "/meccsszervezo";
}

/** Whether this visitor sees the full site: everyone in phase 2, only the admin view in phase 1. */
export function seesFullSite(adminView: boolean): boolean {
  return FULL_SITE || adminView;
}

/** True when the full site is shown only because of the admin view (phase 1). */
export function isDevPreview(adminView: boolean): boolean {
  return !FULL_SITE && adminView;
}
