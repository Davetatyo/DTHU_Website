import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getCurrentProfile } from "@/lib/auth";
import { organizerTabs, siteMenu } from "@/lib/navigation";
import { FULL_SITE } from "@/lib/site-mode";

export const metadata: Metadata = {
  title: { default: "Meccsszervező", template: "%s · Meccsszervező · DTHU" },
  description: "Dice Throne online bajnokság: ellenfél keresés és időpont egyeztetés.",
};

// Shell of the Meccsszervező sub site. Phase 1: its tabs are the main menu.
// Full site: the site menu on top, the Meccsszervező tabs as a second row.
export default async function OrganizerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();
  const tabs = organizerTabs(!!profile?.is_admin);

  return (
    <>
      <SiteHeader tabs={FULL_SITE ? siteMenu : tabs} subTabs={FULL_SITE ? tabs : undefined} section="Meccsszervező" />
      <main className="wrap page-fade">{children}</main>
      <SiteFooter />
    </>
  );
}
