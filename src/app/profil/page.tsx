import { requireProfile, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { CUSTOM_NAME, isProfileComplete, NOT_PLAYING } from "@/lib/profile";
import { KarnyxNameField } from "./KarnyxNameField";
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
  // Preselect the saved choice: a roster name, "Egyedi" for a name not on the roster,
  // or "Nem játszom" for a saved profile without a Karnyx name (organiser or spectator).
  const ownOnRoster = available.find((p) => sameName(p.karnyx_name, profile.karnyx_name));
  const karnyxDefault = profile.karnyx_name
    ? (ownOnRoster?.karnyx_name ?? CUSTOM_NAME)
    : isProfileComplete(profile)
      ? NOT_PLAYING
      : "";

  return (
    <div className="card mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Profilom</h1>
      <p className="muted mt-1">
        Discord: <strong>{profile.discord_username ?? "?"}</strong>
      </p>
      {!isProfileComplete(profile) && (
        <p className="alert-info mt-4">
          Válaszd ki a Karnyx nevedet és add meg a Facebook nevedet, hogy az ellenfeleid megtaláljanak. Ha nem
          játszol a versenyben (szervező vagy néző vagy), a listában válaszd a „Nem játszom” lehetőséget.
        </p>
      )}
      {hiba && <p className="alert-error mt-4">{hiba}</p>}

      <form action={saveProfile} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="karnyx_name">
            Karnyx név
            <InfoTip text="A lista a verseny párosításaiból készül. Egy nevet csak egy felhasználó foglalhat le, így a bot a te meccseidnél téged jelöl meg. Ha még nem szerepelsz egy fordulóban, válaszd az „Egyedi” lehetőséget és írd be a Karnyx nevedet. Ha nem játszol, válaszd a „Nem játszom” lehetőséget." />
          </label>
          <KarnyxNameField
            names={available.map((p) => p.karnyx_name)}
            ownName={profile.karnyx_name}
            defaultChoice={karnyxDefault}
            defaultCustom={karnyxDefault === CUSTOM_NAME ? (profile.karnyx_name ?? "") : ""}
          />
          <p className="muted mt-1 text-sm">
            Nem vagy a listában? Válaszd az „Egyedi” lehetőséget, és írd be a Karnyx nevedet pontosan. Ha a neved
            a listában van, de nem választható, más foglalta le: szólj az adminnak.
          </p>
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
