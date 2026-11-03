import type { Metadata } from "next";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { awardCoins } from "@/features/shop/actions/shop";
import { CoinAmount } from "@/features/shop/components/CoinAmount";
import { formatCoins, TICKET_PRICE } from "@/features/shop/lib/catalog";
import { CoinsNotReady, getAllCoinBalances, getCoinLedger } from "@/features/shop/lib/coins";
import { LedgerList } from "@/features/tickets/components/LedgerList";
import { profileName } from "@/features/tickets/lib/data";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import "@/features/shop/shop.css";
import "@/features/tickets/tickets.css";

export const metadata: Metadata = { title: "Bolt kezelése" };

export default async function ShopAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const { uzenet, hiba } = await searchParams;
  const me = await requireAdmin();
  const { data: profileRows } = await createAdminClient().from("profiles").select("*");
  const profiles = ((profileRows ?? []) as Profile[]).sort((a, b) => profileName(a).localeCompare(profileName(b), "hu"));
  const names = new Map(profiles.map((p) => [p.id, profileName(p)]));

  let data;
  try {
    const [balances, ledger] = await Promise.all([getAllCoinBalances(), getCoinLedger(null, 50)]);
    data = { balances, ledger };
  } catch (err) {
    if (!(err instanceof CoinsNotReady)) throw err;
    data = null;
  }

  const holders = profiles
    .map((p) => ({ id: p.id, name: profileName(p), balance: data?.balances.get(p.id) ?? 0 }))
    .filter((h) => h.balance !== 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <div className="space-y-6">
      <div className="sec-h">
        <h1>Bolt kezelése</h1>
        <Link href={routes.shop} className="btn btn-secondary btn-sm">
          Vissza a boltba
        </Link>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!data && (
        <p className="alert-error">
          Futtasd le a supabase/migrations/0009_dthu_coins.sql fájlt a Supabase SQL Editorban, addig itt semmi sem
          működik.
        </p>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          DTHU coin jóváírása vagy levonása
          <InfoTip
            text={`Egyelőre csak az adminok adhatnak DTHU coint. Negatív számmal coint vonsz le; az egyenleg nem mehet nulla alá. Egy sorsolási jegy ${formatCoins(TICKET_PRICE)} coin a boltban.`}
          />
        </h2>
        <form action={awardCoins} className="space-y-2">
          <label className="label" htmlFor="coin-profile">
            Játékos
          </label>
          <select id="coin-profile" name="profile_id" className="input" defaultValue="" required>
            <option value="" disabled>
              Válassz játékost…
            </option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {profileName(p)}
                {p.karnyx_name && p.display_name ? ` (${p.display_name})` : ""} · {formatCoins(data?.balances.get(p.id) ?? 0)}{" "}
                coin
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <div className="w-32 shrink-0">
              <label className="label" htmlFor="coin-amount">
                DTHU coin
              </label>
              <input id="coin-amount" name="amount" type="number" defaultValue={TICKET_PRICE} className="input" required />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="coin-reason">
                Indok
              </label>
              <input id="coin-reason" name="reason" className="input" placeholder="pl. Ajándék a szervezésért" maxLength={200} required />
            </div>
          </div>
          <SubmitButton>Könyvelés</SubmitButton>
        </form>
      </section>

      {data && (
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <section className="space-y-2">
            <div className="hh">
              <h2>Egyenlegek</h2>
            </div>
            {holders.length === 0 ? (
              <p className="muted text-sm">Még senkinek nincs DTHU coinja.</p>
            ) : (
              <ul className="panel3 ledger">
                {holders.map((h) => (
                  <li key={h.id}>
                    <span className="flex-1">{h.name}</span>
                    <CoinAmount value={h.balance} size={18} className="gold" />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <div className="hh">
              <h2>Legutóbbi coinmozgások</h2>
            </div>
            <LedgerList rows={data.ledger} timeZone={me.timezone} names={names} format={formatCoins} empty="Még nincs coinmozgás." />
          </section>
        </div>
      )}
    </div>
  );
}
