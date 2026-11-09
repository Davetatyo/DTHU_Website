// The site's features, in menu order. One entry per folder in src/features/ and per
// feature branch (feature/<id>). The site menu shows features whose status is not "planned"
// (in phase 1 only admins see that menu, see lib/site-mode.ts).
// When you start or finish a feature, update its status here and in STATE.md.

export type FeatureStatus =
  | "live" //    public now (phase 1)
  | "preview" // built from the prototype; admins only until the full site opens
  | "planned"; // only a README and the design in reference/artifact

export type Feature = {
  /** Folder name in src/features/ and branch name feature/<id>. */
  id: string;
  /** Menu label (Hungarian, as users see it). */
  label: string;
  /** Page path. */
  route: string;
  status: FeatureStatus;
  /** Shown as a small badge in the menu, e.g. "ÚJ". */
  badge?: string;
};

export const FEATURES: Feature[] = [
  { id: "landing-page", label: "Hírek", route: "/", status: "preview" },
  { id: "match-organizer", label: "Időpontfoglaló", route: "/meccsszervezo", status: "live" },
  { id: "rankings", label: "Ranglista", route: "/ranglista", status: "preview" },
  { id: "timetables", label: "Eseménynaptár", route: "/esemenynaptar", status: "preview" },
  { id: "tickets", label: "Sorsolás", route: "/sorsolas", status: "preview", badge: "ÚJ" },
  { id: "shop", label: "Bolt", route: "/bolt", status: "preview", badge: "ÚJ" },
  { id: "games", label: "Játékok", route: "/jatekok", status: "preview", badge: "ÚJ" },
  { id: "rulebook", label: "Szabálytár", route: "/szabalytar", status: "preview" },
  { id: "faq", label: "GYIK", route: "/gyik", status: "preview" },
  { id: "links", label: "Linkek", route: "/linkek", status: "preview" },
  { id: "alchemist", label: "Alkimista", route: "/alkimista", status: "preview" },
  // Opens from the match page, not the menu. "planned" keeps it out of the menu.
  { id: "hero-guide", label: "Hős segédlet", route: "/meccsszervezo", status: "planned" },
  // Opens from the Játékok page (admins only while it's an experiment), no menu item.
  { id: "puzzle", label: "Taktikai feladvány", route: "/jatekok/taktikai-feladvany", status: "planned" },
  // Profilom card, header bar and popups; no menu item.
  { id: "xp", label: "XP", route: "/meccsszervezo/profil", status: "planned" },
];

/** Features that appear in the full-site menu (the Alchemist opens from its help vial instead). */
export const MENU_FEATURES = FEATURES.filter((f) => f.status !== "planned" && f.id !== "alchemist");
