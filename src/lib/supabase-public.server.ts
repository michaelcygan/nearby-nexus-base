import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/**
 * Publishable-key Supabase client for public, read-only server work.
 * Never persists a session and always runs as `anon`, so narrow
 * `TO anon` SELECT policies still apply.
 */
export function createPublicSupabaseClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
