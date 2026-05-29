import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["documents", "reports"] as const;
type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

/**
 * Extract { bucket, path } from a Supabase storage URL (public or signed).
 * Returns null when it isn't a recognizable storage URL for this project.
 */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    // Matches /storage/v1/object/(public|sign)/<bucket>/<path>
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

/**
 * Resolve a storage URL for viewing/downloading.
 * - If the URL points to a private bucket, returns a short-lived signed URL.
 * - Otherwise returns the URL unchanged.
 */
export async function resolveStorageUrl(url: string, expiresInSeconds = 3600): Promise<string> {
  if (!url) return url;
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;
  if (!(PRIVATE_BUCKETS as readonly string[]).includes(parsed.bucket)) return url;

  const { data, error } = await supabase
    .storage
    .from(parsed.bucket as PrivateBucket)
    .createSignedUrl(parsed.path, expiresInSeconds);
  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
}