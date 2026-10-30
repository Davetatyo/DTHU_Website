import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FULL_SITE, isPublicInPhase1, phase1Fallback } from "@/lib/site-mode";

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

  // Phase 1: pages outside the Meccsszervező are a developer preview for admins only
  // (lib/site-mode.ts). Everyone else gets a temporary redirect to the Meccsszervező.
  if (!FULL_SITE && !isPublicInPhase1(request.nextUrl.pathname)) {
    let admin = false;
    if (user) {
      // Signed-in users may read profiles (RLS), so the session client can check the flag.
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      admin = !!data?.is_admin;
    }
    if (!admin) {
      const url = request.nextUrl.clone();
      url.pathname = phase1Fallback(request.nextUrl.pathname);
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
