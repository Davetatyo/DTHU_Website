// Every internal page path in one place. Change a URL here, never in a page or a message builder,
// and add a redirect in next.config.ts for the old path (links live on in Discord posts and calendars).

/** Meccsszervező (match organizer) sub site. */
const MO = "/meccsszervezo";

export const routes = {
  /** Site home ("Hírek"). Phase 1: admins only, everyone else is sent to the Meccsszervező. */
  home: "/",
  /** Every news article (list with category filter and paging) and one article. */
  news: "/hirek",
  newsArticle: (slug: string) => `/hirek/${slug}`,
  newsCategory: (category: string) => `/hirek?rovat=${category}`,

  // Full-site pages (phase 1: admins only, see lib/site-mode.ts)
  rankings: "/ranglista",
  timetables: "/esemenynaptar",
  /** An event's own page (Eseménynaptár). */
  event: (slug: string) => `/esemenynaptar/${slug}`,
  /** Bajnokságok: built-in tournaments with sign-up and hero picks. */
  championships: "/bajnoksagok",
  championship: (slug: string) => `/bajnoksagok/${slug}`,
  championshipsAll: "/bajnoksagok/osszes",
  championshipsAdmin: "/bajnoksagok/admin",
  championshipAdmin: (slug: string) => `/bajnoksagok/admin/${slug}`,
  tickets: "/sorsolas",
  ticketsAdmin: "/sorsolas/admin",
  games: "/jatekok",
  dailyQuiz: "/jatekok/napi-kviz",
  dailySpin: "/jatekok/szerencsekerek",
  gamesAdmin: "/jatekok/admin",
  questionBank: "/jatekok/admin/kerdesek",
  questionEdit: (id: string) => `/jatekok/admin/kerdesek/${id}`,
  tacticianGame: "/jatekok/taktikai-elony",
  diceGame: "/jatekok/kockazat",
  spotGame: "/jatekok/szemfules",
  shop: "/bolt",
  shopAdmin: "/bolt/admin",
  rulebook: "/szabalytar",
  rule: (id: string) => `/szabalytar/${id}`,
  rulebookTab: (tab: string) => `/szabalytar?tab=${tab}`,
  faq: "/gyik",
  links: "/linkek",
  alchemist: "/alkimista",

  organizer: MO,
  match: (id: string) => `${MO}/meccs/${id}`,
  /** A match's Hős segédlet (see features/hero-guide). */
  heroGuide: (id: string) => `${MO}/meccs/${id}/hos-segedlet`,
  schedule: `${MO}/menetrend`,
  organizerFaq: `${MO}/gyik`,
  register: "/regisztracio",
  admin: `${MO}/admin`,
  adminUser: (id: string) => `${MO}/admin/felhasznalo/${id}`,
  /** XP kezelés (see features/xp). */
  adminXp: `${MO}/admin/xp`,
  adminNews: `${MO}/admin/hirek`,
  adminNewsNew: `${MO}/admin/hirek/uj`,
  adminNewsItem: (id: string) => `${MO}/admin/hirek/${id}`,
  adminEvents: `${MO}/admin/esemenyek`,
  adminEventNew: `${MO}/admin/esemenyek/uj`,
  adminEvent: (id: string) => `${MO}/admin/esemenyek/${id}`,
  adminLinks: `${MO}/admin/linkek`,
  adminLinkNew: `${MO}/admin/linkek/uj`,
  adminLink: (id: string) => `${MO}/admin/linkek/${id}`,

  // Account pages. They live in the Meccsszervező until the full site gets its own account area.
  login: `${MO}/login`,
  profile: `${MO}/profil`,

  // Site-wide endpoints: these stay at the root because external services call them.
  authCallback: "/auth/callback",
  signout: "/auth/signout",
  calendarFeed: "/api/calendar",
} as const;
