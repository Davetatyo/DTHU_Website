import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { LogoutIcon, UserIcon } from "@/components/icons";
import { getCurrentProfile } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "DT Meccsszervező",
  description: "Dice Throne online verseny: ellenfél keresés és időpont egyeztetés",
};

// Every page depends on the signed-in visitor and live data.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="hu">
      <body className={`${geistSans.variable} antialiased`}>
        <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {/* Phone: brand + account on the first row, page buttons on the second. Wider: one row. */}
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="truncate text-lg font-bold">
              <span className="hidden sm:inline">DT Meccsszervező</span>
              <span className="sm:hidden">DT Meccsek</span>
            </Link>

            <div className="order-last flex w-full gap-2 sm:order-none sm:w-auto">
              <Link href="/menetrend" className="btn btn-sm btn-outline">
                Menetrend
              </Link>
              {profile?.is_admin && (
                <Link href="/admin" className="btn btn-sm btn-admin">
                  Admin felület
                </Link>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {profile ? (
                <>
                  <Link
                    href="/profil"
                    className="flex max-w-[11rem] items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-medium hover:opacity-85"
                    style={{ borderColor: "var(--border)" }}
                    title="Profilom"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <UserIcon />
                    </span>
                    <span className="truncate">{profile.karnyx_name ?? profile.display_name ?? "Profil"}</span>
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button className="btn btn-sm btn-secondary" title="Kilépés" aria-label="Kilépés">
                      <LogoutIcon />
                      <span className="hidden sm:inline">Kilépés</span>
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn btn-sm btn-discord">
                  Belépés
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
