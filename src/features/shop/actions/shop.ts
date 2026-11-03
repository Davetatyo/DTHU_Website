"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTicketAmount } from "@/features/tickets/lib/draw";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCoins } from "../lib/catalog";
import { loadEconomy } from "../lib/economy-store";
import { shopErrorMessage } from "../lib/errors";

// Every write checks the permission first, then calls a database function from
// supabase/migrations/0009_dthu_coins.sql (it keeps coin and ticket balances consistent).

function back(to: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath(routes.shop, "layout");
  revalidatePath(routes.tickets, "layout");
  redirect(`${to}?${key}=${encodeURIComponent(text)}`);
}

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

/** A player buys Sorsolás tickets with DTHU coins. */
export async function buyTickets(formData: FormData) {
  const me = await requireProfile();
  const quantity = parseTicketAmount(field(formData, "quantity"));
  if (!quantity) back(routes.shop, "hiba", "Adj meg egy pozitív egész számot.");
  const { data, error } = await createAdminClient().rpc("shop_buy_tickets", {
    p_profile: me.id,
    p_quantity: quantity,
    p_unit_price: (await loadEconomy()).ticketPrice,
  });
  if (error) back(routes.shop, "hiba", shopErrorMessage(error));
  back(
    routes.shop,
    "uzenet",
    `Megvetted: ${quantity} sorsolási jegy. Maradt ${formatCoins(Number(data))} DTHU coinod. A jeggyel a Sorsolásnál nevezhetsz.`,
  );
}

/** An admin gives (or, with a negative amount, takes back) DTHU coins. */
export async function awardCoins(formData: FormData) {
  const admin = await requireAdmin();
  const profileId = field(formData, "profile_id");
  const raw = field(formData, "amount").replace(/\s/g, "");
  const amount = /^-?\d{1,7}$/.test(raw) ? Number(raw) : 0;
  const reason = field(formData, "reason");
  if (!profileId) back(routes.shopAdmin, "hiba", "Válassz játékost.");
  if (!amount) back(routes.shopAdmin, "hiba", "Az összeg egy nem nulla egész szám legyen.");
  if (!reason) back(routes.shopAdmin, "hiba", "Add meg, miért jár a coin.");
  const { data, error } = await createAdminClient().rpc("coin_award", {
    p_profile: profileId,
    p_amount: amount,
    p_reason: reason.slice(0, 200),
    p_by: admin.id,
  });
  if (error) back(routes.shopAdmin, "hiba", shopErrorMessage(error));
  back(
    routes.shopAdmin,
    "uzenet",
    `${amount > 0 ? "+" : ""}${formatCoins(amount)} DTHU coin könyvelve. Új egyenleg: ${formatCoins(Number(data))}.`,
  );
}
