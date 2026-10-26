import { NextResponse, type NextRequest } from "next/server";
import { isBootstrapAdmin } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export async function GET(request: NextRequest) {
  const site = await getSiteUrl();
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${site}/login?hiba=1`);

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${site}/login?hiba=1`);

  // Discord identity data from Supabase: provider_id = Discord user ID, name = username.
  const meta = data.user.user_metadata ?? {};
  const discordId: string | null = meta.provider_id ?? meta.sub ?? null;
  const discordUsername: string | null = (meta.name ?? meta.user_name ?? "").replace(/#0$/, "") || null;
  const displayName: string | null = meta.custom_claims?.global_name ?? meta.full_name ?? discordUsername;

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id, is_admin, facebook_name").eq("id", data.user.id).maybeSingle();

  await admin.from("profiles").upsert({
    id: data.user.id,
    discord_id: discordId,
    discord_username: discordUsername,
    display_name: displayName,
    is_admin: existing?.is_admin || isBootstrapAdmin(discordUsername),
  });

  // Only unfinished profiles go to the profile page; organisers without a Karnyx name are fine.
  return NextResponse.redirect(existing && isProfileComplete(existing) ? `${site}/` : `${site}/profil`);
}
