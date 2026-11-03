// What the Bolt sells. For now only Sorsolás tickets (owner, 2026-11-03). The price is passed to
// the database function shop_buy_tickets (supabase/migrations/0009_dthu_coins.sql), so this
// constant is the one place to change it.

/** Price of one Sorsolás ticket, in DTHU coins. */
export const TICKET_PRICE = 3500;

/** Most tickets one purchase may buy (the database refuses more). */
export const MAX_TICKETS_PER_PURCHASE = 100;

/** How many tickets a player can afford with their coins (capped at one purchase's maximum). */
export function affordableTickets(coins: number, price = TICKET_PRICE): number {
  if (price <= 0) return 0;
  return Math.max(0, Math.min(MAX_TICKETS_PER_PURCHASE, Math.floor(coins / price)));
}

/** Coin amounts in Hungarian notation: 3500, 12 000 (non-breaking space between groups). */
export function formatCoins(n: number): string {
  return new Intl.NumberFormat("hu-HU").format(n);
}
