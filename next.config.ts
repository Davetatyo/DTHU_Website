import type { NextConfig } from "next";

const fullSite = process.env.NEXT_PUBLIC_FULL_SITE === "1";

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
      // /gyik becomes the site-wide FAQ once the full site opens, so this one is temporary.
      ...(fullSite ? [] : [{ source: "/gyik", destination: "/meccsszervezo/gyik", permanent: false }]),
    ];
  },
};

export default nextConfig;
