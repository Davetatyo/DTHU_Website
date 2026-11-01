import { routes } from "@/lib/routes";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export async function POST() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${await getSiteUrl()}${routes.login}`, { status: 303 });
}
