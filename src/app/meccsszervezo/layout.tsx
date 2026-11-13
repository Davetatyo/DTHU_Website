import type { Metadata } from "next";
import { DevPreviewBanner } from "@/components/site/DevPreviewBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { headerBadge } from "@/features/profile/components/HeaderBadge";
import { headerXp, XpNotices } from "@/features/xp/components/XpNotices";
import { HeaderWallet } from "@/features/shop/components/HeaderWallet";
import { getAdminView } from "@/lib/auth";
import { canSeePlayerStats } from "@/features/player-stats/lib/access";
import type { NavItem } from "@/components/site/NavTabs";
import { routes } from "@/lib/routes";
import { organizerTabs, siteMenu } from "@/lib/navigation";
import { isDevPreview, seesFullSite } from "@/lib/site-mode";

export const metadata: Metadata = {
  title: { default: "Időpontfoglaló", template: "%s · Időpontfoglaló · DTHU" },
  description: "Dice Throne online bajnokság: ellenfél keresés és időpont egyeztetés.",
};

// Shell of the Meccsszervező, the site's "Időpontfoglaló" tab. Phase 1: the public sees only
// this, with its own tabs as the main menu. Admins (and everyone in phase 2) see the site
// menu on top and these tabs as a second row.
export default async function OrganizerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adminView = await getAdminView();
  const full = seesFullSite(adminView);
  // "Játékosok" (player stats), before GYIK, only for those who may see stats
  // (admins while PLAYER_STATS_ADMINS_ONLY is on).
  const tabs: NavItem[] = (await canSeePlayerStats())
    ? [...organizerTabs.slice(0, -1), { href: routes.players, label: "Játékosok", also: [routes.player("").slice(0, -1)] }, ...organizerTabs.slice(-1)]
    : organizerTabs;

  return (
    <>
      <SiteHeader tabs={full ? siteMenu : tabs} subTabs={full ? tabs : undefined} section="Időpontfoglaló"
        wallet={<HeaderWallet />}
        userBadge={await headerBadge()}
        userXp={await headerXp()}
      />
      <main className="wrap page-fade">
        {isDevPreview(adminView) && (
          <div className="mb-4">
            <DevPreviewBanner />
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
      <XpNotices />
    </>
  );
}
