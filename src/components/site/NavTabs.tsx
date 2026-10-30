"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  /** Also active on sub-pages (e.g. /meccsszervezo/meccs/… under Meccsszervező). Default: exact match only. */
  prefix?: boolean;
  /** Extra paths that should light this tab (e.g. match pages under the overview tab). */
  also?: string[];
  variant?: "admin";
  badge?: string;
};

function isActive(item: NavItem, path: string): boolean {
  const match = (p: string) => path === p || ((item.prefix || p !== item.href) && path.startsWith(`${p}/`));
  return match(item.href) || (item.also ?? []).some(match);
}

/** The tab row under the site header. Highlights the tab of the current page. */
export function NavTabs({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={item.variant}
          aria-current={isActive(item, path) ? "page" : undefined}
        >
          {item.label}
          {item.badge && <span className="new">{item.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
