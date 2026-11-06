"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireProfile } from "@/lib/auth";
import { HERO_NAMES } from "@/lib/heroes";
import { createAdminClient } from "@/lib/supabase/server";
import { getTournamentBySlug } from "@/features/championships/lib/run";
import { registrationBlocker, validateHeroPicks } from "@/features/championships/lib/rules";
import type { Profile } from "@/features/match-organizer/lib/types";
import type { Championship, Registration } from "@/features/championships/lib/types";

// Player side of Bajnokságok: join with 3 heroes, change them, lock in, or leave.
// Everything is allowed only while registration is open, and nothing once locked in.

function go(path: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath(path);
  redirect(`${path}?${key}=${encodeURIComponent(text)}`);
}

async function load(formData: FormData): Promise<{ me: Profile; t: Championship; reg: Registration | null; back: string }> {
  const me = await requireProfile();
  const t = await getTournamentBySlug(String(formData.get("slug") ?? ""));
  if (!t) go(routes.championships, "hiba", "A verseny nem található.");
  const { data } = await createAdminClient()
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", t.id)
    .eq("profile_id", me.id)
    .maybeSingle();
  return { me, t, reg: (data as Registration | null) ?? null, back: routes.championship(t.slug) };
}

export async function saveRegistration(formData: FormData) {
  const { me, t, reg, back } = await load(formData);
  if (!me.karnyx_name) go(back, "hiba", "Előbb állítsd be a Karnyx neved a profilodban.");
  const blocked = registrationBlocker(t.status, reg);
  if (blocked) go(back, "hiba", blocked);

  const picks = validateHeroPicks(
    [formData.get("hero_1"), formData.get("hero_2"), formData.get("hero_3")].map((v) => String(v ?? "")),
    HERO_NAMES,
  );
  if (!picks.ok) go(back, "hiba", picks.error);

  const { error } = await createAdminClient()
    .from("tournament_registrations")
    .upsert(
      {
        tournament_id: t.id,
        profile_id: me.id,
        karnyx_name: me.karnyx_name,
        heroes: picks.heroes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tournament_id,profile_id" },
    );
  if (error) go(back, "hiba", "Mentés sikertelen, próbáld újra.");
  go(back, "uzenet", reg ? "Hőseid frissítve." : "Jelentkeztél! A hőseidet a kezdésig módosíthatod.");
}

export async function lockRegistration(formData: FormData) {
  const { t, reg, back, me } = await load(formData);
  if (!reg) go(back, "hiba", "Előbb jelentkezz és válassz hősöket.");
  const blocked = registrationBlocker(t.status, reg);
  if (blocked) go(back, "hiba", blocked);
  await createAdminClient()
    .from("tournament_registrations")
    .update({ locked_at: new Date().toISOString() })
    .eq("tournament_id", t.id)
    .eq("profile_id", me.id)
    .is("locked_at", null);
  go(back, "uzenet", "Véglegesítve. Kezdéskor ezekkel a hősökkel indulsz.");
}

export async function leaveTournament(formData: FormData) {
  const { t, reg, back, me } = await load(formData);
  if (!reg) go(back, "hiba", "Nem vagy jelentkezve erre a versenyre.");
  const blocked = registrationBlocker(t.status, reg);
  if (blocked) go(back, "hiba", blocked);
  await createAdminClient().from("tournament_registrations").delete().eq("tournament_id", t.id).eq("profile_id", me.id).is("locked_at", null);
  go(back, "uzenet", "Kiléptél a versenyből.");
}
