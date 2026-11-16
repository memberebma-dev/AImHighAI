import { serverDb } from "./db";

/**
 * Verifies the caller's Supabase access token server-side and returns their
 * real userId — never trust a client-supplied userId in a request body. Every
 * route that touches tenant data must call this first.
 */
async function verify(env: Record<string, string>, authHeader: string | null) {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Unauthorized: missing session token");
  const { sb } = serverDb(env);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new Error(`Unauthorized: ${error?.message || "invalid session token"}`);
  return data.user;
}

export async function requireUserId(env: Record<string, string>, authHeader: string | null): Promise<string> {
  return (await verify(env, authHeader)).id;
}

// Affiliates/subscribers are AgentOrch's OWN business data. Placeholder owner
// gate until a real role system exists. Keep in sync with src/lib/auth.ts.
const OWNER_EMAIL = "memberebma@gmail.com";

export async function requireOwner(env: Record<string, string>, authHeader: string | null): Promise<string> {
  const user = await verify(env, authHeader);
  if ((user.email || "").toLowerCase() !== OWNER_EMAIL) {
    throw new Error("Forbidden: this data belongs to the platform owner, not your account");
  }
  return user.id;
}
