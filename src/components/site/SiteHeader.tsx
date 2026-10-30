import Link from "next/link";
import { LogoutIcon, UserIcon } from "@/components/icons";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { seesFullSite } from "@/lib/site-mode";
import { ViewAsToggle } from "./ViewAsToggle";
import { NavTabs, type NavItem } from "./NavTabs";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Sticky site header: brand, theme switch, admin button + view switch (admins) and account on
 * the first row, page tabs below. A section (e.g. the Meccsszervező) can add its own second
 * tab row with `subTabs`.
 */
export async function SiteHeader({ tabs, subTabs, section }: { tabs: NavItem[]; subTabs?: NavItem[]; section?: string }) {
  const profile = await getCurrentProfile();
  const adminView = await getAdminView();
  const name = profile ? (profile.karnyx_name ?? profile.display_name ?? "Profil") : null;

  return (
    <header className="topbar">
      <div className="tb-row r1">
        <Link href={seesFullSite(adminView) ? routes.home : routes.organizer} className="brand" aria-label="DTHU – Dice Throne Hungary, főoldal">
          <span className="brand-die" aria-hidden />
          <span>
            <b>DTHU</b>
            <small>Dice Throne Hungary</small>
          </span>
        </Link>
        {section && <span className="kicker hidden sm:inline">{section}</span>}
        <div className="tb-right">
          <ThemeToggle />
          {profile ? (
            <>
              {/* Real admins always get these, also in the player view, so they can switch back. */}
              {profile.is_admin && (
                <>
                  <Link href={routes.admin} className="tb-btn admin">
                    Admin felület
                  </Link>
                  <ViewAsToggle playerView={!adminView} />
                </>
              )}
              <Link href={routes.profile} className="tb-user" title="Profilom">
                <span className="ini">
                  <UserIcon />
                </span>
                <span className="truncate">{name}</span>
              </Link>
              <form action={routes.signout} method="post">
                <button className="tb-btn" title="Kilépés" aria-label="Kilépés">
                  <LogoutIcon />
                  <span className="hidden sm:inline">Kilépés</span>
                </button>
              </form>
            </>
          ) : (
            <Link href={routes.login} className="tb-btn gold">
              Belépés Discorddal
            </Link>
          )}
        </div>
      </div>
      <div className="tb-row r2">
        <NavTabs items={tabs} label="Főmenü" />
      </div>
      {subTabs && (
        <div className="tb-row r2">
          <NavTabs items={subTabs} label={section ?? "Almenü"} />
        </div>
      )}
    </header>
  );
}
