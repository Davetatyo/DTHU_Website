import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Szabálytár reads its content files at request time (full pages); ship them with the
  // server functions.
  outputFileTracingIncludes: {
    "/szabalytar": ["./src/features/rulebook/content/**/*"],
    "/szabalytar/[...path]": ["./src/features/rulebook/content/**/*"],
  },
  // The Meccsszervező moved from the site root to /meccsszervezo (v2.0). Old links live on in
  // Discord posts, bookmarks and calendar events, so they redirect. /auth and /api never moved.
  async redirects() {
    return [
      { source: "/meccs/:id", destination: "/meccsszervezo/meccs/:id", permanent: true },
      { source: "/menetrend", destination: "/meccsszervezo/menetrend", permanent: true },
      { source: "/admin", destination: "/meccsszervezo/admin", permanent: true },
      { source: "/admin/:path*", destination: "/meccsszervezo/admin/:path*", permanent: true },
      { source: "/profil", destination: "/meccsszervezo/profil", permanent: true },
      { source: "/login", destination: "/meccsszervezo/login", permanent: true },
      // Versenynaptár was renamed to Eseménynaptár (it lists every kind of event, not only
      // tournaments).
      { source: "/versenynaptar", destination: "/esemenynaptar", permanent: true },
      { source: "/versenynaptar/:path*", destination: "/esemenynaptar/:path*", permanent: true },
      // The Jegyek page was removed (2026-11-03); the Bolt still shows the ticket balance.
      { source: "/jegyek", destination: "/bolt", permanent: true },
      // /gyik is the site-wide FAQ now; in phase 1 the middleware sends visitors who can't see
      // it to the Meccsszervező FAQ (lib/site-mode.ts → phase1Fallback).
    ];
  },
};

export default nextConfig;
