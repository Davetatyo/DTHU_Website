import { routes } from "@/lib/routes";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { SubmitButton } from "@/components/SubmitButton";

async function signInWithDiscord() {
  "use server";
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${await getSiteUrl()}${routes.authCallback}`, scopes: "identify" },
  });
  if (error || !data.url) redirect(`${routes.login}?hiba=1`);
  redirect(data.url);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const { hiba } = await searchParams;
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="text-2xl font-bold">Bejelentkezés</h1>
      <p className="muted mt-2">
        A Discord fiókoddal lépsz be, így az ellenfeled látja a Discord nevedet, és a bot meg tud jelölni a
        csatornában.
      </p>
      {hiba && <p className="alert-error mt-4">A bejelentkezés nem sikerült, próbáld újra.</p>}
      <form action={signInWithDiscord} className="mt-6">
        <SubmitButton className="btn btn-discord w-full">Belépés Discorddal</SubmitButton>
      </form>
    </div>
  );
}
