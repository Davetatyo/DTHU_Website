import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FULL_SITE, isPublicInPhase1, phase1Fallback } from "@/lib/site-mode";
import { VIEW_AS_COOKIE, wantsPlayerView } from "@/lib/view-as";

export async function middleware(request: NextRequest) {
  // Keeps the Supabase session cookie fresh on every page request.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Phase 1 (lib/site-mode.ts): pages outside the Meccsszervező need the admin view: a real admin
  // who hasn't switched to the player view (lib/view-as.ts). Others get a temporary redirect.
  const path = request.nextUrl.pathname;
  if (!FULL_SITE && !isPublicInPhase1(path)) {
    let adminView = false;
    if (user && !wantsPlayerView(request.cookies.get(VIEW_AS_COOKIE)?.value)) {
      // Signed-in users may read profiles (RLS), so the session client can check the flag.
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      adminView = !!data?.is_admin;
    }
    if (!adminView) {
      const url = request.nextUrl.clone();
      url.pathname = phase1Fallback(path);
      url.search = "";
      const redirect = NextResponse.redirect(url, 307);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/calendar|api/cron|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
