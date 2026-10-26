import { requireProfile, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import { saveProfile } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { InfoTip } from "@/components/InfoTip";

const COMMON_ZONES = [DEFAULT_TIMEZONE, "Europe/London", "Europe/Berlin", "Europe/Bucharest", "America/New_York"];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const { hiba } = await searchParams;
  const profile = await requireProfile();
  const tournament = await getActiveTournament();
  const players = tournament ? await getPlayers(tournament.id) : [];

  const { data: claimed } = await createAdminClient().from("profiles").select("id, karnyx_name").not("karnyx_name", "is", null);
  const takenByOthers = new Set(
    (claimed ?? []).filter((c) => c.id !== profile.id).map((c) => String(c.karnyx_name).toLowerCase()),
  );
  const available = players.filter((p) => !takenByOthers.has(p.karnyx_name.toLowerCase()));
  const zones = [...new Set([...COMMON_ZONES, ...Intl.supportedValuesOf("timeZone")])];

  return (
    <div className="card mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Profilom</h1>
      <p className="muted mt-1">
        Discord: <strong>{profile.discord_username ?? "?"}</strong>
      </p>
      {!profile.karnyx_name && (
        <p className="alert-info mt-4">
          Válaszd ki a Karnyx nevedet és add meg a Facebook nevedet, hogy az ellenfeleid megtaláljanak.
        </p>
      )}
      {hiba && <p className="alert-error mt-4">{hiba}</p>}

      <form action={saveProfile} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="karnyx_name">
            Karnyx név
            <InfoTip text="A lista a verseny párosításaiból készül. Egy nevet csak egy felhasználó foglalhat le, így a bot a te meccseidnél téged jelöl meg." />
          </label>
          {available.length > 0 ? (
            <select id="karnyx_name" name="karnyx_name" className="input" defaultValue={profile.karnyx_name ?? ""} required>
              <option value="" disabled>
                Válassz…
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.karnyx_name}>
                  {p.karnyx_name}
                  {sameName(p.karnyx_name, profile.karnyx_name) ? " (te)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <input id="karnyx_name" name="karnyx_name" className="input" defaultValue={profile.karnyx_name ?? ""} required />
          )}
          <p className="muted mt-1 text-sm">Nem találod magad? Lehet, hogy más foglalta le, szólj az adminnak.</p>
        </div>
        <div>
          <label className="label" htmlFor="facebook_name">
            Facebook név
            <InfoTip text="Ezen a néven keresnek majd a Facebook csoportban. Csak a bejelentkezett felhasználók látják." />
          </label>
          <input id="facebook_name" name="facebook_name" className="input" defaultValue={profile.facebook_name ?? ""} required />
        </div>
        <div>
          <label className="label" htmlFor="timezone">
            Időzóna
            <InfoTip text="Az oldalon minden időpontot ebben az időzónában látsz és adsz meg. Ha Magyarországon vagy, hagyd Budapesten." />
          </label>
          <select id="timezone" name="timezone" className="input" defaultValue={profile.timezone}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="btn w-full">Mentés</SubmitButton>
      </form>
    </div>
  );
}
