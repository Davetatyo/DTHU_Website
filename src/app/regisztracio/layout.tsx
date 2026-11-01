import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { routes } from "@/lib/routes";

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="topbar">
        <div className="tb-row r1">
          <Link href={routes.register} className="brand" aria-label="DTHU – Dice Throne Hungary">
            <span className="brand-die" aria-hidden />
            <span>
              <b>DTHU</b>
              <small>Dice Throne Hungary</small>
            </span>
          </Link>
          <div className="tb-right">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="wrap page-fade">{children}</main>
      <SiteFooter />
    </>
  );
}
