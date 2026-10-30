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
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/features/match-organizer/lib/types";
import { adminSetKarnyxName } from "@/features/match-organizer/actions/admin";

export const metadata: Metadata = { title: "Felhasználó szerkesztése" };

// Admin-only: fix another user's Karnyx name (wrong pick, or "Nem játszom" by mistake).
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hiba?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { hiba } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = createAdminClient();
  const { data } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const user = data as Profile;

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

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={routes.admin} className="muted text-sm">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>Felhasználó szerkesztése</h1>
      </div>
      <div className="card space-y-4">
        <div>
          <dl className="mt-2 space-y-0.5 text-sm">
            <div>
              <dt className="muted inline">Megjelenő név: </dt>
              <dd className="inline font-medium">{user.display_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="muted inline">Discord: </dt>
              <dd className="inline font-medium">{user.discord_username ?? "—"}</dd>
            </div>
            <div>
              <dt className="muted inline">Facebook: </dt>
              <dd className="inline font-medium">{user.facebook_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="muted inline">Jelenlegi Karnyx név: </dt>
              <dd className="inline font-medium">{user.karnyx_name ?? "nincs (nem játszik)"}</dd>
            </div>
          </dl>
        </div>

        {hiba && <p className="alert-error">{hiba}</p>}

        <form action={adminSetKarnyxName} className="space-y-3">
          <input type="hidden" name="profile_id" value={user.id} />
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
          <p className="muted text-sm">
            Mentés után a játékost azonnal hozzárendeljük a név meccseihez: látja a „Következő meccsem” kártyát,
            és a bot Discordon megjelöli.
          </p>
          <SubmitButton className="btn w-full">Mentés</SubmitButton>
        </form>
      </div>
    </div>
  );
}
