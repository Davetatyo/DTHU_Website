import { describe, expect, it } from "vitest";
import { affordableTickets, formatCoins, MAX_TICKETS_PER_PURCHASE, TICKET_PRICE } from "./catalog";

describe("affordableTickets", () => {
  it("counts whole tickets only", () => {
    expect(affordableTickets(0)).toBe(0);
    expect(affordableTickets(TICKET_PRICE - 1)).toBe(0);
    expect(affordableTickets(TICKET_PRICE)).toBe(1);
    expect(affordableTickets(TICKET_PRICE * 2 + 1000)).toBe(2);
  });

  it("is capped at one purchase's maximum", () => {
    expect(affordableTickets(TICKET_PRICE * 1000)).toBe(MAX_TICKETS_PER_PURCHASE);
  });

  it("never goes negative", () => {
    expect(affordableTickets(-500)).toBe(0);
    expect(affordableTickets(100, 0)).toBe(0);
  });
});

describe("formatCoins", () => {
  it("groups thousands the Hungarian way", () => {
    expect(formatCoins(3500).replace(/\s/g, " ")).toBe("3500");
    expect(formatCoins(12000).replace(/\s/g, " ")).toBe("12 000");
  });
});
