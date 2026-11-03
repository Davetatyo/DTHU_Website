import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CoinAmount } from "@/features/shop/components/CoinAmount";
import { TicketOffer } from "@/features/shop/components/TicketOffer";
import { CoinsNotReady, getCoinBalance } from "@/features/shop/lib/coins";
import { loadEconomy } from "@/features/shop/lib/economy-store";
import { getBalance, TicketsNotReady } from "@/features/tickets/lib/data";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/shop/shop.css";

export const metadata: Metadata = { title: "Bolt" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  const { uzenet, hiba } = await searchParams;
  const viewer = await getCurrentProfile();
  const adminView = await getAdminView();

  // Players see only their own balances (no history); admins see the coin ledger on /bolt/admin.
  let coins: number | null = null;
  let tickets: number | null = null;
  let ready = true;
  if (viewer) {
    try {
      [coins, tickets] = await Promise.all([getCoinBalance(viewer.id), getBalance(viewer.id)]);
    } catch (err) {
      if (!(err instanceof CoinsNotReady || err instanceof TicketsNotReady)) throw err;
      ready = false;
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="sec-h">
          <h1>Bolt</h1>
          {adminView && (
            <Link href={routes.shopAdmin} className="btn btn-admin btn-sm">
              Bolt kezelése
            </Link>
          )}
        </div>
        <p className="lead">DTHU coinért sorsolási jegyet vehetsz, amivel a Sorsolásokon nevezhetsz.</p>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!ready && (
        <p className="alert-error">
          A bolt adatbázisa még nincs beállítva (supabase/migrations/0009_dthu_coins.sql). Amíg nem fut le, nem
          lehet vásárolni.
        </p>
      )}

      {viewer && ready && (
        <div className="strip">
          <span className="pill">
            Egyenleg: <CoinAmount value={coins ?? 0} className="gold" />
          </span>
          <span className="pill">
            <Icon id="ticket" className="tok" /> Jegyek: <b>{tickets ?? 0}</b>
          </span>
        </div>
      )}

      <TicketOffer coins={ready ? coins : null} signedIn={!!viewer} price={(await loadEconomy()).ticketPrice} />
    </div>
  );
}
