import type { NavItem } from "@/components/site/NavTabs";
import { MENU_FEATURES } from "@/features/registry";
import { routes } from "./routes";

/** Full-site menu (only shown once NEXT_PUBLIC_FULL_SITE is on). */
export const siteMenu: NavItem[] = MENU_FEATURES.map((f) => ({
  href: f.route,
  label: f.label,
  prefix: f.route !== "/",
  badge: f.badge,
}));

/** The Meccsszervező's own tabs. */
export function organizerTabs(isAdmin: boolean): NavItem[] {
  return [
    { href: routes.organizer, label: "Áttekintés", also: [`${routes.organizer}/meccs`] },
    { href: routes.schedule, label: "Közelgő meccsek" },
    { href: routes.organizerFaq, label: "GYIK" },
    ...(isAdmin ? [{ href: routes.admin, label: "Admin felület", prefix: true, variant: "admin" as const }] : []),
  ];
}
