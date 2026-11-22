import { Hono } from "hono";
import Stripe from "stripe";
import { serverDb, supabaseSecretKey } from "../lib/db.js";

/**
 * Public status check: says whether each integration's key is present and
 * accepted, never the key itself. Every check is free (no metered calls).
 */
type Check = { configured: boolean; ok: boolean | null; detail?: string };

async function timed<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timed out")), ms))]);
}

const app = new Hono<{ Bindings: Record<string, string> }>();

app.get("/", async (c) => {
  const env = c.env;
  const checks: Record<string, Check> = {};

  checks.supabase = { configured: !!(env.SUPABASE_URL && supabaseSecretKey(env)), ok: null };
  if (checks.supabase.configured) {
    try {
      const { sb } = serverDb(env);
      const { error } = await timed(sb.auth.admin.listUsers({ page: 1, perPage: 1 }));
      checks.supabase.ok = !error;
      if (error) checks.supabase.detail = error.message;
    } catch (e: any) { checks.supabase = { ...checks.supabase, ok: false, detail: e.message }; }
  }

  checks.groq = { configured: !!env.GROQ_API_KEY, ok: null };
  if (env.GROQ_API_KEY) {
    try {
      const r = await timed(fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` } }));
      checks.groq.ok = r.ok;
      if (!r.ok) checks.groq.detail = `HTTP ${r.status}`;
    } catch (e: any) { checks.groq = { ...checks.groq, ok: false, detail: e.message }; }
  }

  checks.stripe = { configured: !!env.STRIPE_SECRET_KEY, ok: null };
  if (env.STRIPE_SECRET_KEY) {
    try {
      await timed(new Stripe(env.STRIPE_SECRET_KEY).balance.retrieve());
      checks.stripe.ok = true;
    } catch (e: any) { checks.stripe = { ...checks.stripe, ok: false, detail: e.message }; }
  }

  checks.resend = { configured: !!env.RESEND_API_KEY, ok: null };
  if (env.RESEND_API_KEY) {
    try {
      const r = await timed(fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } }));
      checks.resend.ok = r.ok;
      if (r.ok) {
        const body = (await r.json()) as any;
        const verified = (body?.data || []).filter((d: any) => d.status === "verified").map((d: any) => d.name);
        checks.resend.detail = verified.length ? `verified domains: ${verified.join(", ")}` : "no verified sending domain yet";
      } else checks.resend.detail = `HTTP ${r.status}`;
    } catch (e: any) { checks.resend = { ...checks.resend, ok: false, detail: e.message }; }
  }

  // Treg calls are metered, so only presence is reported here.
  checks.treg = { configured: !!env.TREG_TOKEN, ok: null, detail: "checked on first lead search" };

  const healthy = Object.values(checks).every((x) => x.ok !== false);
  return c.json({ healthy, checks }, healthy ? 200 : 503);
});

export default app;
