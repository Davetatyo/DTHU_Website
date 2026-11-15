import type { Metadata } from "next";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { AdminGameRow } from "@/features/match-reporting/components/AdminGameRow";
import { MATCH_REPORTING_ADMINS_ONLY } from "@/features/match-reporting/lib/access";
import { ADMIN_GAME_FILTERS, getAdminGames, type AdminGameFilter } from "@/features/match-reporting/lib/data";
import "@/features/match-reporting/match-reporting.css";

export const metadata: Metadata = { title: "Játszmák kezelése" };

const FILTER_LABELS: Record<AdminGameFilter, string> = { pending: "Függőben", finalized: "Végleges", closed: "Egyéb", all: "Mind" };
const EMPTY: Record<AdminGameFilter, string> = {
  pending: "Nincs jóváhagyásra váró játszma.",
  finalized: "Még nincs végleges játszma.",
  closed: "Nincs visszavont, lejárt vagy érvénytelenített játszma.",
  all: "Még nincs rögzített játszma.",
};
const LIMIT = 200;

export default async function AdminGamesPage({ searchParams }: { searchParams: Promise<{ allapot?: string }> }) {
  const me = await requireAdmin();
  const { allapot } = await searchParams;
  const filter: AdminGameFilter = (ADMIN_GAME_FILTERS as readonly string[]).includes(allapot ?? "") ? (allapot as AdminGameFilter) : "pending";
  const games = await getAdminGames(filter, LIMIT);
  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={routes.admin} className="muted text-sm hover:text-[var(--fg)]">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>Játszmák kezelése</h1>
      </div>
      <p className="muted -mt-2 text-sm">
        Minden rögzített játszma: casual, ranked és bajnoki. Egy játszmát megnyitva az eredményét módosíthatod vagy érvénytelenítheted,
        indoklással.
        <InfoTip text="Bajnoki eredményt a bajnokság meccsoldalán lehet módosítani. A saját, még függő játszmádat nem zárhatod le adminként: azt az ellenfelednek kell jóváhagynia, vagy egy másik adminnak." />
      </p>
      {MATCH_REPORTING_ADMINS_ONLY && <p className="alert-info text-sm">Tesztüzem: a Játszmákat egyelőre csak az adminok látják.</p>}

      <nav className="gr-filter" aria-label="Szűrés állapot szerint">
        {ADMIN_GAME_FILTERS.map((f) => (
          <Link key={f} href={f === "pending" ? routes.adminGames : `${routes.adminGames}?allapot=${f}`} aria-current={f === filter ? "page" : undefined}>
            {FILTER_LABELS[f]}
          </Link>
        ))}
      </nav>

      <section className="gr-card">
        {filter === "pending" && games.length > 0 && (
          <p className="gr-note pt-3">A sárgával jelölt játszmák legalább 3 napja várnak; 7 nap után maguktól lejárnak.</p>
        )}
        {games.length === 0 ? (
          <p className="gr-empty pt-4">{EMPTY[filter]}</p>
        ) : (
          <ul className="gr-list">
            {games.map((g) => (
              <li key={g.id}>
                <AdminGameRow game={g} adminId={me.id} timeZone={me.timezone} now={now} />
              </li>
            ))}
          </ul>
        )}
        {games.length === LIMIT && <p className="gr-note pt-3">Csak a legutóbbi {LIMIT} játszma látszik.</p>}
      </section>
    </div>
  );
}
