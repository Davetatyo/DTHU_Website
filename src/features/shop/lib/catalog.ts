// What the Bolt sells. For now only Sorsolás tickets (owner, 2026-11-03). The price is a setting
// admins change on the Játékok admin page (economy_config `ticket_price`, see lib/economy.ts);
// the server passes it to shop_buy_tickets (migration 0009).

/** Default price of one Sorsolás ticket, in DTHU coins (used until an admin sets another). */
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
