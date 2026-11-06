import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createChampionship } from "@/features/championships/actions/admin";
import { FormatPicker } from "@/features/championships/components/FormatPicker";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import { getChampionships, getRegistrationCounts, startDue } from "@/features/championships/lib/run";
import { FORMAT_LABELS, STATUS_LABELS } from "@/features/championships/lib/rules";

export const metadata: Metadata = { title: "Bajnokságok kezelése" };

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<{ uzenet?: string; hiba?: string }> }) {
  const { uzenet, hiba } = await searchParams;
  const me = await requireAdmin();
  const tournaments = await getChampionships({ includeDrafts: true });
  if (await startDue(tournaments)) redirect(routes.championshipsAdmin);
  const counts = await getRegistrationCounts(tournaments.map((t) => t.id));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={routes.championships} className="muted text-sm">
          ← Bajnokságok
        </Link>
        <div className="sec-h">
          <h1>Bajnokságok kezelése</h1>
        </div>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Új verseny
          <InfoTip text="Ezek a bajnokságok a beépített párosítóval futnak, a Karnyx bajnokságtól és az Időpontfoglaló fordulóitól külön. A játékosok a Bajnokságok oldalon jelentkeznek 3 hőssel." />
        </h2>
        <form action={createChampionship} className="space-y-3">
          <div>
            <label className="label" htmlFor="name">Név</label>
            <input id="name" name="name" className="input max-w-sm" placeholder="pl. Novemberi Svájci Kupa" required />
          </div>
          <FormatPicker />
          <div>
            <label className="label" htmlFor="starts_at">
              Kezdés
              <InfoTip text="Ekkor zárul a jelentkezés: minden jelentkező bekerül, és ha az automatikus párosítás be van kapcsolva, elkészül az 1. forduló. Üresen hagyva te indítod kézzel." />
            </label>
            <input id="starts_at" name="starts_at" type="datetime-local" className="input" />
            <p className="muted mt-1 text-xs">
              Időzóna: {me.timezone}. A verseny akkor indul, amikor a kezdés után valaki először megnyitja; ha senki, legkésőbb egy órán belül.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="auto_pairing" defaultChecked /> Automatikus párosítás (1. forduló a kezdéskor, a többi az utolsó eredmény után)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="open_now" defaultChecked /> Jelentkezés azonnal nyitva
            </label>
          </div>
          <SubmitButton>Létrehozás</SubmitButton>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">Bajnokságok ({tournaments.length})</h2>
        {tournaments.length === 0 ? (
          <p className="muted text-sm">Még nincs ilyen verseny.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl w-full text-sm">
              <thead>
                <tr>
                  <th>Név</th>
                  <th>Állapot</th>
                  <th>Formátum</th>
                  <th className="text-right">Jelentkezők</th>
                  <th>Kezdés</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium">
                      <Link href={routes.championshipAdmin(t.slug)} className="underline">
                        {t.name}
                      </Link>
                    </td>
                    <td>{STATUS_LABELS[t.status]}</td>
                    <td>{FORMAT_LABELS[t.format]}</td>
                    <td className="text-right tabular-nums">{counts.get(t.id) ?? 0}</td>
                    <td>{t.starts_at ? formatDateTime(t.starts_at, me.timezone) : "kézi"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
