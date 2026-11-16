import { createClient } from "@supabase/supabase-js";
import { makeDb } from "../../shared/dbAdapter";

/**
 * Server-side database handle (replaces Blink's createClient). Uses the
 * Supabase service-role key, which bypasses RLS — so every query here MUST
 * filter by the caller's verified userId, exactly as the Blink code did.
 */
export function serverDb(env: Record<string, string>) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server");
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { db: makeDb(sb), sb };
}
