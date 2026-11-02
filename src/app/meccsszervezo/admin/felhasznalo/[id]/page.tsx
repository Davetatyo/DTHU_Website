import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KarnyxNameField } from "@/features/match-organizer/components/KarnyxNameField";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin, sameName } from "@/lib/auth";
import { getActiveTournament, getPlayers } from "@/features/match-organizer/lib/data";
import { CUSTOM_NAME, isProfileComplete, NOT_PLAYING } from "@/features/match-organizer/lib/profile";
import { formatDateTime, timeZoneOptions } from "@/features/match-organizer/lib/time";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/features/match-organizer/lib/types";
import { adminSaveProfile } from "@/features/match-organizer/actions/admin";
import { AvatarEditor } from "@/features/profile/components/AvatarEditor";
import { BanButton } from "@/features/profile/components/BanButton";
import { avatarPublicUrl } from "@/features/profile/lib/avatar";
import { banBlockReason, isBanned } from "@/features/profile/lib/ban";
import { adminRemoveAvatar, adminUploadAvatar } from "@/features/profile/actions/avatar";
import { banUser, unbanUser } from "@/features/profile/actions/ban";

export const metadata: Metadata = { title: "Profil szerkesztése" };

// Admin-only: edit another user's profile (Karnyx name, Facebook name, time zone, picture)
// and ban or unban them.
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hiba?: string; uzenet?: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const { hiba, uzenet } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = createAdminClient();
  const { data } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const user = data as Profile;
  const who = user.display_name || user.discord_username || "Felhasználó";

  const tournament = await getActiveTournament();
  const roster = tournament ? await getPlayers(tournament.id) : [];
  const { data: claimed } = await db.from("profiles").select("id, karnyx_name").not("karnyx_name", "is", null);
  const takenByOthers = new Set(
    (claimed ?? []).filter((c) => c.id !== user.id).map((c) => String(c.karnyx_name).toLowerCase()),
  );
  const available = roster.filter((p) => !takenByOthers.has(p.karnyx_name.toLowerCase()));

  const onRoster = available.find((p) => sameName(p.karnyx_name, user.karnyx_name));
  const defaultChoice = user.karnyx_name
    ? (onRoster?.karnyx_name ?? CUSTOM_NAME)
    : isProfileComplete(user)
      ? NOT_PLAYING
      : "";

  const banned = isBanned(user);
  const banBlocked = banned ? null : banBlockReason(me, user);
  let bannedBy: string | null = null;
  if (banned && user.banned_by) {
    const { data: by } = await db.from("profiles").select("display_name, discord_username").eq("id", user.banned_by).maybeSingle();
    bannedBy = by?.display_name || by?.discord_username || null;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={routes.admin} className="muted text-sm">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>Profil szerkesztése</h1>
      </div>

      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {banned && (
        <p className="alert-error">
          <strong>Kitiltva</strong> {formatDateTime(user.banned_at!, me.timezone)}
          {bannedBy ? ` (${bannedBy})` : ""}. Nem tud belépni az oldalra.
        </p>
      )}

      <div className="card space-y-4">
        <dl className="space-y-0.5 text-sm">
          <div>
            <dt className="muted inline">Megjelenő név: </dt>
            <dd className="inline font-medium">{user.display_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="muted inline">Discord: </dt>
            <dd className="inline font-medium">{user.discord_username ?? "—"}</dd>
          </div>
          <div>
            <dt className="muted inline">Jelenlegi Karnyx név: </dt>
            <dd className="inline font-medium">{user.karnyx_name ?? "nincs (nem játszik)"}</dd>
          </div>
        </dl>

        {!banned && (
          <div className="border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <p className="label">
              Profilkép
              <InfoTip text="Ha a kép sértő vagy nem odaillő, töröld, vagy tölts fel helyette másikat. A játékos a saját profilján újra cserélheti." />
            </p>
            <AvatarEditor
              currentUrl={avatarPublicUrl(user.avatar_path)}
              upload={adminUploadAvatar}
              remove={adminRemoveAvatar}
              profileId={user.id}
            />
          </div>
        )}

        <form action={adminSaveProfile} className="space-y-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <input type="hidden" name="profile_id" value={user.id} />
          <div>
            <label className="label" htmlFor="karnyx_name">
              Karnyx név
              <InfoTip text="A lista a verseny még szabad neveit mutatja. Ha a játékos még nem szerepel egy fordulóban, válaszd az „Egyedi” lehetőséget és írd be a nevét pontosan. Ha a név máshoz tartozik, előbb ott szabadítsd fel." />
            </label>
            <KarnyxNameField
              names={available.map((p) => p.karnyx_name)}
              ownName={user.karnyx_name}
              defaultChoice={defaultChoice}
              defaultCustom={defaultChoice === CUSTOM_NAME ? (user.karnyx_name ?? "") : ""}
            />
            <p className="muted mt-1 text-sm">
              Mentés után a játékost azonnal hozzárendeljük a név meccseihez: látja a „Következő meccsem” kártyát,
              és a bot Discordon megjelöli.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="facebook_name">
              Facebook név
            </label>
            <input id="facebook_name" name="facebook_name" className="input" defaultValue={user.facebook_name ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="timezone">
              Időzóna
            </label>
            <select id="timezone" name="timezone" className="input" defaultValue={user.timezone}>
              {timeZoneOptions().map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="btn w-full">Mentés</SubmitButton>
        </form>
      </div>

      <section className="card danger-zone space-y-3">
        <h2 className="text-lg font-bold">
          Kitiltás
          <InfoTip text="Szabálysértő felhasználóknak. A kitiltott Discord fiókkal többé nem lehet belépni; a felhasználó azonnal kilép. A profilja megmarad (így a tiltás a Discord fiókhoz kötődik), a képe törlődik, a meccsei nem változnak." />
        </h2>
        {banned ? (
          <form action={unbanUser} className="space-y-2">
            <input type="hidden" name="profile_id" value={user.id} />
            <p className="muted text-sm">A tiltás feloldása után újra beléphet a Discord fiókjával.</p>
            <SubmitButton className="btn btn-secondary">Tiltás feloldása</SubmitButton>
          </form>
        ) : banBlocked ? (
          <p className="muted text-sm">{banBlocked}</p>
        ) : (
          <>
            <p className="muted text-sm">
              A kitiltott felhasználó a Discord fiókjával többé nem tud belépni. Két lépésben történik, nehogy
              véletlenül kattints rá.
            </p>
            <BanButton profileId={user.id} name={who} action={banUser} />
          </>
        )}
      </section>
    </div>
  );
}
