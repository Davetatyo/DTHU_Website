import Link from "next/link";
import { cache } from "react";
import { DthuCoin } from "@/components/DthuCoin";
import { Icon } from "@/components/Icon";
import { getBalance } from "@/features/tickets/lib/data";
import { getAdminView, getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { seesFullSite } from "@/lib/site-mode";
import { formatCoins } from "../lib/catalog";
import { getCoinBalance } from "../lib/coins";
import "./wallet.css";

// The player's DTHU coins and Sorsolás tickets, always in the header (one capsule before the
// profile chip): coins link to the Bolt, tickets to Sorsolás. The layouts pass it to SiteHeader
// (components/ may not import features). Hidden while the shop and Sorsolás are hidden
// (phase 1: only admins in admin view see them), and whenever the balances can't be read,
// so the header never breaks the live Időpontfoglaló.

const balances = cache(async (profileId: string) => {
  try {
    const [coins, tickets] = await Promise.all([getCoinBalance(profileId), getBalance(profileId)]);
    return { coins, tickets };
  } catch {
    return null; // e.g. migrations 0008/0009 not applied yet
  }
});

export async function HeaderWallet() {
  const profile = await getCurrentProfile();
  if (!profile || !seesFullSite(await getAdminView())) return null;
  const wallet = await balances(profile.id);
  if (!wallet) return null;

  return (
    <span className="tb-wallet" role="group" aria-label="Egyenlegeim">
      <Link href={routes.shop} title="DTHU coin egyenleged · Bolt" className="seg">
        <DthuCoin size={18} />
        <span className="n">{formatCoins(wallet.coins)}</span>
        <span className="sr-only">DTHU coin</span>
      </Link>
      <Link href={routes.tickets} title="Sorsolási jegyeid · Sorsolás" className="seg">
        <Icon id="ticket" className="tk" />
        <span className="n">{wallet.tickets}</span>
        <span className="sr-only">sorsolási jegy</span>
      </Link>
    </span>
  );
}
