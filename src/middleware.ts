import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FULL_SITE, isLoginGatedInPhase1, isPublicInPhase1, phase1Fallback } from "@/lib/site-mode";
import { routes } from "@/lib/routes";
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

  const path = request.nextUrl.pathname;

  // The visitor's profile, read once (select * so it works before and after migration 0002).
  const profile: { is_admin?: boolean; banned_at?: string | null } | null = user
    ? (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data
    : null;

  // Banned users (features/profile): end their session and show the login page with a notice.
  if (profile?.banned_at) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.search = "?hiba=tiltva";
    const redir = NextResponse.redirect(url, 307);
    response.cookies.getAll().forEach((c) => redir.cookies.set(c));
    return redir;
  }

  if (!FULL_SITE) {
    // Login-gated pages (e.g. /meccsszervezo): any logged-in user can see them;
    // anonymous visitors go to the registration guide.
    if (isLoginGatedInPhase1(path) && path !== routes.login && !user) {
      const url = request.nextUrl.clone();
      url.pathname = routes.register;
      url.search = "";
      const redir = NextResponse.redirect(url, 307);
      response.cookies.getAll().forEach((c) => redir.cookies.set(c));
      return redir;
    }

    // Everything else outside public and login-gated paths needs the admin view.
    if (!isPublicInPhase1(path) && !isLoginGatedInPhase1(path)) {
      const adminView = !!profile?.is_admin && !wantsPlayerView(request.cookies.get(VIEW_AS_COOKIE)?.value);
      if (!adminView) {
        const url = request.nextUrl.clone();
        url.pathname = phase1Fallback(path);
        url.search = "";
        const redirect = NextResponse.redirect(url, 307);
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
        return redirect;
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/calendar|api/cron|api/szabalytar|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
