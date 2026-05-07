import { supabase } from "@/integrations/supabase/client";

const TTL = 60 * 60; // 1 hour

/** Get a single signed URL for a tracks-bucket file. */
export async function signedTrackUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("tracks").createSignedUrl(path, TTL);
  if (error || !data?.signedUrl) throw error ?? new Error("Sign failed");
  return data.signedUrl;
}

/** Sign many paths at once and return a map of path → signed URL. */
export async function signedTrackUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase.storage.from("tracks").createSignedUrls(unique, TTL);
  if (error) throw error;
  const map = new Map<string, string>();
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}
