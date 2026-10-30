import type { NavItem } from "@/components/site/NavTabs";
import { MENU_FEATURES } from "@/features/registry";
import { routes } from "./routes";

/** Full-site menu (phase 1: admin view only). Admin-only features appear only in the admin view. */
export function siteMenu(adminView: boolean): NavItem[] {
  return MENU_FEATURES.filter((f) => !f.adminOnly || adminView).map((f) => ({
    href: f.route,
    label: f.label,
    prefix: f.route !== "/",
    badge: f.badge,
    variant: f.adminOnly ? ("admin" as const) : undefined,
  }));
}

/** The Meccsszervező's own tabs. (The admin page is reached from the header button.) */
export const organizerTabs: NavItem[] = [
  { href: routes.organizer, label: "Áttekintés", also: [`${routes.organizer}/meccs`] },
  { href: routes.schedule, label: "Közelgő meccsek" },
  { href: routes.organizerFaq, label: "GYIK" },
];
