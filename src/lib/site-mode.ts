// Launch phases (see STATE.md → "Launch plan").
//
// Phase 1 (default): the public sees only the Meccsszervező. The rest of the site is built and
// deployed, but only admins see it (developer preview, with a banner saying so).
// Phase 2: NEXT_PUBLIC_FULL_SITE=1 opens the whole site to everyone.
//
// NEXT_PUBLIC_* values are baked in at build time: change it in Vercel, then redeploy.

export const FULL_SITE = process.env.NEXT_PUBLIC_FULL_SITE === "1";

/** Paths that are public in phase 1. Everything else is admin-only until the full site opens. */
export const PHASE1_PUBLIC_PREFIXES = ["/meccsszervezo", "/auth", "/api"];

export function isPublicInPhase1(pathname: string): boolean {
  return PHASE1_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Where a hidden page sends visitors who can't see it in phase 1. Old /gyik links meant the Meccsszervező FAQ. */
export function phase1Fallback(pathname: string): string {
  return pathname === "/gyik" ? "/meccsszervezo/gyik" : "/meccsszervezo";
}

/** Whether this visitor sees the full site: everyone in phase 2, only admins in phase 1. */
export function seesFullSite(profile: { is_admin: boolean } | null | undefined): boolean {
  return FULL_SITE || !!profile?.is_admin;
}

/** True when the full site is shown to this visitor only because they are an admin (phase 1). */
export function isDevPreview(profile: { is_admin: boolean } | null | undefined): boolean {
  return !FULL_SITE && !!profile?.is_admin;
}
