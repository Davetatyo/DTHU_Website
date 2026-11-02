"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { wallTimeToUtc } from "@/features/match-organizer/lib/time";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import { parseTicketAmount } from "../lib/draw";
import { ticketErrorMessage } from "../lib/errors";
import { holdDraw } from "../lib/run";
import type { Draw } from "../lib/types";

// Every write checks the permission first, then calls a database function from
// supabase/migrations/0002_ticket_draws.sql (they keep balances and closing times consistent).

function back(to: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath(routes.tickets, "layout");
  redirect(`${to}?${key}=${encodeURIComponent(text)}`);
}

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();

// ── Players ─────────────────────────────────────────────────────────────────────────────────

export async function enterDraw(formData: FormData) {
  const me = await requireProfile();
  const drawId = field(formData, "draw_id");
  const tickets = parseTicketAmount(field(formData, "tickets"));
  if (!tickets) back(routes.tickets, "hiba", "Adj meg egy pozitív egész számot.");
  const { data, error } = await createAdminClient().rpc("ticket_draw_enter", {
    p_draw: drawId,
    p_profile: me.id,
    p_tickets: tickets,
  });
  if (error) back(routes.tickets, "hiba", ticketErrorMessage(error));
  back(routes.tickets, "uzenet", `Benne vagy: ${tickets} jegyet tettél be, összesen ${data} jegyed van ebben a sorsolásban.`);
}

// ── Admins ──────────────────────────────────────────────────────────────────────────────────

export async function awardTickets(formData: FormData) {
  const admin = await requireAdmin();
  const profileId = field(formData, "profile_id");
  const amount = parseTicketAmount(field(formData, "amount"), true);
  const reason = field(formData, "reason");
  if (!profileId) back(routes.ticketsAdmin, "hiba", "Válassz játékost.");
  if (!amount) back(routes.ticketsAdmin, "hiba", "A jegyek száma egy nem nulla egész szám legyen.");
  if (!reason) back(routes.ticketsAdmin, "hiba", "Add meg, miért jár a jegy.");
  const { data, error } = await createAdminClient().rpc("ticket_award", {
    p_profile: profileId,
    p_amount: amount,
    p_reason: reason.slice(0, 200),
    p_by: admin.id,
  });
  if (error) back(routes.ticketsAdmin, "hiba", ticketErrorMessage(error));
  back(routes.ticketsAdmin, "uzenet", `${amount > 0 ? "+" : ""}${amount} jegy könyvelve. Új egyenleg: ${data}.`);
}

/** Podium of a tournament (online or live) in one go: 1st, 2nd and 3rd place. */
export async function awardPodium(formData: FormData) {
  const admin = await requireAdmin();
  const event = field(formData, "event");
  if (!event) back(routes.ticketsAdmin, "hiba", "Add meg a verseny nevét.");
  const places = [1, 2, 3]
    .map((place) => ({
      place,
      profileId: field(formData, `place${place}`),
      amount: parseTicketAmount(field(formData, `amount${place}`)),
    }))
    .filter((p) => p.profileId);
  if (places.length === 0) back(routes.ticketsAdmin, "hiba", "Válassz legalább egy helyezettet.");
  if (new Set(places.map((p) => p.profileId)).size !== places.length) {
    back(routes.ticketsAdmin, "hiba", "Ugyanaz a játékos nem lehet több helyen.");
  }
  if (places.some((p) => !p.amount)) back(routes.ticketsAdmin, "hiba", "Minden helyezéshez adj meg pozitív jegyszámot.");

  const db = createAdminClient();
  const done: string[] = [];
  for (const p of places) {
    const { error } = await db.rpc("ticket_award", {
      p_profile: p.profileId,
      p_amount: p.amount,
      p_reason: `${event.slice(0, 150)} · ${p.place}. hely`,
      p_by: admin.id,
    });
    if (error) {
      const sofar = done.length ? ` (${done.join(", ")} már könyvelve)` : "";
      back(routes.ticketsAdmin, "hiba", `${p.place}. hely: ${ticketErrorMessage(error)}${sofar}`);
    }
    done.push(`${p.place}. hely`);
  }
  back(routes.ticketsAdmin, "uzenet", `Dobogó jegyei könyvelve: ${event}.`);
}

export async function createDraw(formData: FormData) {
  const admin = await requireAdmin();
  const title = field(formData, "title").slice(0, 120);
  const prize = field(formData, "prize").slice(0, 200);
  const description = field(formData, "description").slice(0, 1000) || null;
  const winnerCount = parseTicketAmount(field(formData, "winner_count"));
  const capText = field(formData, "max_tickets");
  const cap = capText ? parseTicketAmount(capText) : null;
  if (!title || !prize) back(routes.ticketsAdmin, "hiba", "A sorsolásnak kell cím és nyeremény.");
  if (!winnerCount || winnerCount > 100) back(routes.ticketsAdmin, "hiba", "A nyertesek száma 1 és 100 között legyen.");
  if (capText && !cap) back(routes.ticketsAdmin, "hiba", "A jegylimit pozitív egész szám legyen, vagy hagyd üresen.");
  let closesAt: Date;
  try {
    closesAt = wallTimeToUtc(field(formData, "closes_at"), admin.timezone);
  } catch {
    back(routes.ticketsAdmin, "hiba", "Érvénytelen zárási időpont.");
  }
  if (closesAt.getTime() <= Date.now()) back(routes.ticketsAdmin, "hiba", "A zárás időpontja a jövőben legyen.");

  const { error } = await createAdminClient().from("ticket_draws").insert({
    title,
    prize,
    description,
    closes_at: closesAt.toISOString(),
    winner_count: winnerCount,
    max_tickets_per_player: cap,
    created_by: admin.id,
  });
  if (error) back(routes.ticketsAdmin, "hiba", ticketErrorMessage(error));
  back(routes.ticketsAdmin, "uzenet", `„${title}” sorsolás létrehozva.`);
}

/** Closes the draw now and draws the winners immediately (instead of waiting for the hourly run). */
export async function drawNow(formData: FormData) {
  await requireAdmin();
  const drawId = field(formData, "draw_id");
  const db = createAdminClient();
  const { error: closeError } = await db.rpc("ticket_draw_close_now", { p_draw: drawId });
  if (closeError) back(routes.ticketsAdmin, "hiba", ticketErrorMessage(closeError));
  const { data } = await db.from("ticket_draws").select("*").eq("id", drawId).maybeSingle();
  const draw = data as Draw | null;
  if (!draw || draw.status !== "open") back(routes.ticketsAdmin, "hiba", "Ez a sorsolás már nem nyitott.");
  let completed = false;
  try {
    completed = (await holdDraw(draw, await getSiteUrl())).completed;
  } catch (err) {
    back(routes.ticketsAdmin, "hiba", ticketErrorMessage(err instanceof Error ? err : null));
  }
  if (!completed) back(routes.ticketsAdmin, "hiba", "A sorsolást közben már megtartották.");
  back(routes.ticketsAdmin, "uzenet", `„${draw.title}” sorsolás megtartva, az eredmény kint van.`);
}

export async function cancelDraw(formData: FormData) {
  const admin = await requireAdmin();
  const { data, error } = await createAdminClient().rpc("ticket_draw_cancel", {
    p_draw: field(formData, "draw_id"),
    p_by: admin.id,
  });
  if (error) back(routes.ticketsAdmin, "hiba", ticketErrorMessage(error));
  back(routes.ticketsAdmin, "uzenet", `Sorsolás törölve, ${data} játékos visszakapta a jegyeit.`);
}
