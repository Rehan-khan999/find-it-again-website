import { supabase } from "@/integrations/supabase/client";

const PUBLIC_MARKER = "/storage/v1/object/public/";
const SIGNED_TTL = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; expires: number }>();

/** Extracts { bucket, path } from a stored Supabase storage URL (public or plain path). */
function parseStorageRef(value: string): { bucket: string; path: string } | null {
  if (!value) return null;
  const idx = value.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  const rest = value.slice(idx + PUBLIC_MARKER.length).split("?")[0];
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return { bucket: rest.slice(0, slash), path: decodeURIComponent(rest.slice(slash + 1)) };
}

/**
 * Resolves a stored photo reference into a short-lived signed URL.
 * Non-storage URLs (external/demo images) are returned untouched.
 */
export async function resolveStorageUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  const ref = parseStorageRef(value);
  if (!ref) return value;

  const key = `${ref.bucket}/${ref.path}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, SIGNED_TTL);

  if (error || !data?.signedUrl) return null;

  cache.set(key, { url: data.signedUrl, expires: Date.now() + (SIGNED_TTL - 60) * 1000 });
  return data.signedUrl;
}
