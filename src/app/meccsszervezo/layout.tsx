import type { Metadata } from "next";
import { DevPreviewBanner } from "@/components/site/DevPreviewBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAdminView } from "@/lib/auth";
import { organizerTabs, siteMenu } from "@/lib/navigation";
import { isDevPreview, seesFullSite } from "@/lib/site-mode";

export const metadata: Metadata = {
  title: { default: "Meccsszervező", template: "%s · Meccsszervező · DTHU" },
  description: "Dice Throne online bajnokság: ellenfél keresés és időpont egyeztetés.",
};

// Shell of the Meccsszervező, the site's "Meccsszervező" tab. Phase 1: the public sees only
// this, with its own tabs as the main menu. Admins (and everyone in phase 2) see the site
// menu on top and these tabs as a second row.
export default async function OrganizerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adminView = await getAdminView();
  const full = seesFullSite(adminView);

  return (
    <>
      <SiteHeader tabs={full ? siteMenu : organizerTabs} subTabs={full ? organizerTabs : undefined} section="Meccsszervező" />
      <main className="wrap page-fade">
        {isDevPreview(adminView) && (
          <div className="mb-4">
            <DevPreviewBanner />
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
