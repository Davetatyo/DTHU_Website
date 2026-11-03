import Link from "next/link";
import { Art } from "@/components/Art";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { routes } from "@/lib/routes";
import { buyTickets } from "../actions/shop";
import { affordableTickets, formatCoins } from "../lib/catalog";
import { CoinAmount } from "./CoinAmount";

/**
 * The Bolt's one item for now: a Sorsolás ticket for `price` coins (the admin setting).
 * `coins` is null for anonymous visitors (and when the coin table isn't there yet).
 */
export function TicketOffer({ coins, signedIn, price }: { coins: number | null; signedIn: boolean; price: number }) {
  const canBuy = coins == null ? 0 : affordableTickets(coins, price);
  return (
    <div className="tile offer">
      <Art spec={{ c1: "#e0b24a", c2: "#7a2fb0", g: "ticket", prompt: "glowing golden raffle ticket, fantasy UI" }} />
      <span className="badge-tr price">
        <CoinAmount value={price} size={22} />
      </span>
      <div className="in">
        <h3>Sorsolási jegy</h3>
        <span className="sub">
          Egy jegy = egy nevezés egy sorsoláson. Minél több jegyet teszel be, annál nagyobb az esélyed.{" "}
          <Link href={routes.tickets} className="underline">
            Aktuális sorsolások
          </Link>
        </span>
        {!signedIn ? (
          <Link href={routes.login} className="btn btn-discord btn-sm self-start">
            Belépés a vásárláshoz
          </Link>
        ) : canBuy === 0 ? (
          <span className="sub">
            Még nincs elég DTHU coinod: egy jegy {formatCoins(price)} coinba kerül
            {coins != null && `, ${formatCoins(price - coins)} hiányzik`}.
          </span>
        ) : (
          <form action={buyTickets} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label" htmlFor="buy-quantity" style={{ color: "#f4ecda" }}>
                Darab
                <InfoTip text="A megvett jegyek azonnal az egyenlegedre kerülnek, és a Sorsolás oldalon nevezhetsz velük. A vásárlást nem lehet visszavonni." />
              </label>
              <input
                id="buy-quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={canBuy}
                defaultValue={1}
                className="input w-24"
                required
              />
            </div>
            <SubmitButton confirm="Megveszed a jegyeket? A DTHU coint nem kapod vissza.">Megveszem</SubmitButton>
            <span className="sub text-xs">legfeljebb {canBuy} db</span>
          </form>
        )}
      </div>
    </div>
  );
}
