import { createClient } from "@supabase/supabase-js";
import { makeDb } from "../../shared/dbAdapter.js";

/**
 * Server-side database handle (replaces Blink's createClient). Uses the
 * Supabase service-role key, which bypasses RLS — so every query here MUST
 * filter by the caller's verified userId, exactly as the Blink code did.
 */
/** The secret key was saved in Vercel as `supabase_aimhighai`; Vercel can't rename sensitive keys, so accept both names. */
export function supabaseSecretKey(env: Record<string, string>): string {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.supabase_aimhighai || "";
}

export function serverDb(env: Record<string, string>) {
  const secret = supabaseSecretKey(env);
  if (!env.SUPABASE_URL || !secret) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server");
  }
  const sb = createClient(env.SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { db: makeDb(sb), sb };
}
