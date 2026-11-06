"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import "../championships.css";

type Tab = "overview" | "all" | "admin";

function activeTab(path: string): Tab {
  if (path === routes.championshipsAdmin || path.startsWith(`${routes.championshipsAdmin}/`)) return "admin";
  if (path === routes.championshipsAll) return "all";
  return "overview";
}

/**
 * The Bajnokságok sub-tabs (like the Időpontfoglaló's second row). "Áttekintés" also covers
 * every championship page, so it stays lit while viewing one.
 */
export function ChampionshipTabs({ admin }: { admin: boolean }) {
  const active = activeTab(usePathname());
  const tabs: { id: Tab; href: string; label: string }[] = [
    { id: "overview", href: routes.championships, label: "Áttekintés" },
    { id: "all", href: routes.championshipsAll, label: "Összes bajnokság" },
    ...(admin ? [{ id: "admin" as const, href: routes.championshipsAdmin, label: "Kezelés" }] : []),
  ];
  return (
    <nav className="ch-tabs" aria-label="Bajnokságok">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={active === t.id ? "page" : undefined} className={t.id === "admin" ? "adm" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
