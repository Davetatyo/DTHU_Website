import { headers } from "next/headers";

/**
 * Public base URL of the current request, e.g. https://dthuonlinebajnoksag.vercel.app (no trailing slash).
 *
 * Taken from the domain the visitor actually opened, so login redirects and links are right on
 * Vercel, on a custom domain and on localhost without any configuration. NEXT_PUBLIC_SITE_URL is
 * only a fallback for the rare case where the request carries no host.
 */
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
