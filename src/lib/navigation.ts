import type { NavItem } from "@/components/site/NavTabs";
import { MENU_FEATURES } from "@/features/registry";
import { routes } from "./routes";

/** Full-site menu (phase 1: admin view only). */
export const siteMenu: NavItem[] = MENU_FEATURES.map((f) => ({
  href: f.route,
  label: f.label,
  prefix: f.route !== "/",
  badge: f.badge,
}));

/** The Meccsszervező's own tabs. (The admin page is reached from the header button.) */
export const organizerTabs: NavItem[] = [
  { href: routes.organizer, label: "Áttekintés", also: [`${routes.organizer}/meccs`] },
  { href: routes.schedule, label: "Közelgő meccsek" },
  { href: routes.organizerFaq, label: "GYIK" },
];
