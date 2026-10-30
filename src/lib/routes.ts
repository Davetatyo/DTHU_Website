// Every internal page path in one place. Change a URL here, never in a page or a message builder,
// and add a redirect in next.config.ts for the old path (links live on in Discord posts and calendars).

/** Meccsszervező (match organizer) sub site. */
const MO = "/meccsszervezo";

export const routes = {
  /** Site home ("Hírek"). Phase 1: admins only, everyone else is sent to the Meccsszervező. */
  home: "/",

  // Full-site pages (phase 1: admins only, see lib/site-mode.ts)
  rankings: "/ranglista",
  timetables: "/versenynaptar",
  tickets: "/jegyek",
  shop: "/bolt",
  rulebook: "/szabalytar",
  rule: (id: string) => `/szabalytar/${id}`,
  rulebookTab: (tab: string) => `/szabalytar?tab=${tab}`,
  faq: "/gyik",
  links: "/linkek",
  alchemist: "/alkimista",
  /** Admin-only Karnyx tool (lib/site-mode.ts → ADMIN_ONLY_PREFIXES). */
  karnyx: "/karnyx",

  organizer: MO,
  match: (id: string) => `${MO}/meccs/${id}`,
  schedule: `${MO}/menetrend`,
  organizerFaq: `${MO}/gyik`,
  admin: `${MO}/admin`,
  adminUser: (id: string) => `${MO}/admin/felhasznalo/${id}`,

  // Account pages. They live in the Meccsszervező until the full site gets its own account area.
  login: `${MO}/login`,
  profile: `${MO}/profil`,

  // Site-wide endpoints: these stay at the root because external services call them.
  authCallback: "/auth/callback",
  signout: "/auth/signout",
  calendarFeed: "/api/calendar",
} as const;
