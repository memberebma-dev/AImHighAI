import { Hono } from "hono";
import { serverDb } from "../lib/db.js";
import { validateOptin } from "../lib/optin.js";

// Public endpoint behind the lead magnets (free audit, calculator, guide).
// No auth by design; abuse is limited by the honeypot, strict validation and size caps.
export const optinApp = new Hono();

optinApp.post("/", async (c) => {
  const len = Number(c.req.header("content-length") || 0);
  if (len > 8_000) return c.json({ error: "Request too large." }, 413);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid request." }, 400); }

  const result = validateOptin((body || {}) as Record<string, unknown>);
  if (!result.ok) return c.json({ error: result.error }, 400);
  if (result.bot) return c.json({ ok: true });

  const { sb } = serverDb(c.env as Record<string, string>);
  const { error } = await sb.from("optins").insert(result.row);
  if (error) {
    console.error("optin insert failed:", error.message);
    return c.json({ error: "We couldn't save that. Please try again in a minute." }, 500);
  }
  return c.json({ ok: true });
});
