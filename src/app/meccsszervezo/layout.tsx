import type { Metadata } from "next";
import { DevPreviewBanner } from "@/components/site/DevPreviewBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCurrentProfile } from "@/lib/auth";
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
  const profile = await getCurrentProfile();
  const tabs = organizerTabs(!!profile?.is_admin);
  const full = seesFullSite(profile);

  return (
    <>
      <SiteHeader tabs={full ? siteMenu : tabs} subTabs={full ? tabs : undefined} section="Meccsszervező" />
      <main className="wrap page-fade">
        {isDevPreview(profile) && (
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
