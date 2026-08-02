import { createPublicSupabaseClient } from "@/lib/supabase-public.server";

/**
 * Records one anonymous scan of an access point and returns where to send the
 * visitor. Nothing about the visitor is stored: no IP address, no device
 * fingerprint, no location, no account — only a total count and the time of the
 * most recent scan on the access point itself.
 */
export async function recordScanAndResolveDestination(code: string): Promise<string | null> {
  const trimmed = code.trim().slice(0, 64);
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("record_access_point_scan", { _code: trimmed });
  if (error) return null;
  const destination = typeof data === "string" ? data : null;
  // Only same-origin paths are ever followed.
  if (!destination || !destination.startsWith("/") || destination.startsWith("//")) return null;
  return destination;
}
