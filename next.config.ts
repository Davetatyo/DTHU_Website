import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      // /gyik is the site-wide FAQ now; in phase 1 the middleware sends visitors who can't see
      // it to the Meccsszervező FAQ (lib/site-mode.ts → phase1Fallback).
    ];
  },
};

export default nextConfig;
