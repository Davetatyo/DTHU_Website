import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routes } from "@/lib/routes";
import { FULL_SITE, isPublicInPhase1 } from "@/lib/site-mode";

export async function middleware(request: NextRequest) {
  // Phase 1: only the Meccsszervező is public (see lib/site-mode.ts). Temporary redirect,
  // so browsers don't remember it once the full site opens.
  if (!FULL_SITE && !isPublicInPhase1(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.organizer;
    return NextResponse.redirect(url, 307);
  }

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

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/calendar|api/cron|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
