import { DevPreviewBanner } from "@/components/site/DevPreviewBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HelpVial } from "@/features/alchemist/components/HelpVial";
import { SeasonPhases } from "@/features/timetables/components/SeasonPhases";
import { getAdminView } from "@/lib/auth";
import { siteMenu } from "@/lib/navigation";
import { isDevPreview } from "@/lib/site-mode";

// Shell of the full website (everything outside the Meccsszervező). Phase 1: only admins get
// here (middleware), so it shows the developer-preview strip.
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adminView = await getAdminView();
  return (
    <>
      <SiteHeader tabs={siteMenu} />
      <div className="wrap space-y-3 pb-0">
        {isDevPreview(adminView) && <DevPreviewBanner />}
        <SeasonPhases />
      </div>
      <main className="wrap page-fade">{children}</main>
      <SiteFooter />
      <HelpVial />
    </>
  );
}
