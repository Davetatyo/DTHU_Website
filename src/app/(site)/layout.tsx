import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteMenu } from "@/lib/navigation";

// Shell of the full website (everything outside the Meccsszervező). Hidden in phase 1:
// middleware redirects these pages to /meccsszervezo until NEXT_PUBLIC_FULL_SITE=1.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader tabs={siteMenu} />
      <main className="wrap page-fade">{children}</main>
      <SiteFooter />
    </>
  );
}
