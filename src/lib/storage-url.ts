// Public addresses of files in Supabase Storage's public buckets (profile pictures, event
// pictures). Site-wide so shared components such as the header can build them.

/** Public address of a stored file, or null when there is none. */
export function publicStorageUrl(
  bucket: string,
  path: string | null | undefined,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}
