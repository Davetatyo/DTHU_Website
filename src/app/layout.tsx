import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
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
          <nav className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 text-sm sm:gap-5 sm:text-base">
            <Link href="/" className="mr-auto truncate text-lg font-bold">
              🎲 <span className="hidden sm:inline">DT Meccsszervező</span>
              <span className="sm:hidden">DT Meccsek</span>
            </Link>
            <Link href="/menetrend">Menetrend</Link>
            {profile?.is_admin && <Link href="/admin">Admin</Link>}
            {profile ? (
              <>
                <Link href="/profil">{profile.karnyx_name ?? profile.display_name ?? "Profil"}</Link>
                <form action="/auth/signout" method="post">
                  <button className="muted text-sm">Kilépés</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-sm btn-discord">
                Belépés
              </Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
