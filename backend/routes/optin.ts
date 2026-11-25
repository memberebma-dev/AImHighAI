import { Hono } from "hono";
import { serverDb } from "../lib/db.js";
import { validateOptin } from "../lib/optin.js";
import { runAudit, auditHtml, type AuditReport } from "../lib/audit.js";
import { sendEmail, SITE_URL } from "../lib/email.js";

// Public endpoint behind the lead magnets (free audit, calculator, guide).
// No auth by design; abuse is limited by the honeypot, strict validation and size caps.
export const optinApp = new Hono();

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function calculatorHtml(d: Record<string, unknown>): string {
  const missed = Number(d.missedCallsPerWeek) || 0, job = Number(d.avgJob) || 0, close = (Number(d.closeRate) || 0) / 100;
  const monthly = missed * 4.33 * close * job;
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111">
<h2>Your missed-call plan</h2>
<p>With <b>${missed}</b> missed calls a week, a <b>${money(job)}</b> average job and a <b>${Math.round(close * 100)}%</b> booking rate, missed calls could be costing up to <b>${money(monthly)}/month</b> (${money(monthly * 12)}/year).</p>
<h3>The 3 fastest fixes</h3><ol>
<li>Turn on missed-call text back, so every missed caller gets a reply in seconds.</li>
<li>Return every missed call at lunch and at 5pm, even with no voicemail.</li>
<li>Put a tap-to-call button at the top of your website on phones.</li></ol>
<p>Want it set up for you? Our Missed-call text-back plan is $197/mo. Reply to this email, or get a free audit of your whole setup: <a href="${SITE_URL}/free-audit">${SITE_URL}/free-audit</a></p>
<p style="font-size:12px;color:#888">This is the upper-end estimate; some callers call back. <a href="${SITE_URL}/privacy#opt-out">Unsubscribe</a></p></div>`;
}

optinApp.post("/", async (c) => {
  const env = c.env as Record<string, string>;
  const len = Number(c.req.header("content-length") || 0);
  if (len > 8_000) return c.json({ error: "Request too large." }, 413);

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid request." }, 400); }

  const result = validateOptin((body || {}) as Record<string, unknown>);
  if (!result.ok) return c.json({ error: result.error }, 400);
  if (result.bot) return c.json({ ok: true });
  const row = result.row as Record<string, any>;

  // Build the deliverable first, so it is saved with the lead and shown on screen.
  let report: AuditReport | null = null;
  let auditError = "";
  if (row.magnet === "lead-leak-audit" && row.business && row.city && env.TREG_TOKEN) {
    try {
      report = await runAudit(env.TREG_TOKEN, env.TREG_ORG || "", row.business, row.city, String(row.details?.trade || "plumber"));
      row.details = { ...(row.details || {}), auditScore: report.score, auditFound: report.found ? 1 : 0, offer: report.offer?.id || "" };
    } catch (e: any) {
      auditError = e?.message || "lookup failed";
      console.error("audit failed:", auditError);
    }
  }

  const { sb } = serverDb(env);
  const { error } = await sb.from("optins").insert(row);
  if (error) {
    console.error("optin insert failed:", error.message);
    return c.json({ error: "We couldn't save that. Please try again in a minute." }, 500);
  }

  // Emails go out after the response so the visitor isn't kept waiting.
  const owner = env.OWNER_EMAIL || "memberebma@gmail.com";
  const emails = (async () => {
    if (report) await sendEmail(env, row.email, `Your Lead Leak Audit: ${report.business} scored ${report.score}/100`, auditHtml(report, SITE_URL));
    else if (row.magnet === "missed-call-calculator") await sendEmail(env, row.email, "Your missed-call plan", calculatorHtml(row.details || {}));
    await sendEmail(env, owner, `New lead: ${row.business || row.email} (${row.magnet})`,
      `<p><b>${esc(row.name)}</b> · ${esc(row.business)} · ${esc(row.city)}<br>${esc(row.email)} · ${esc(row.phone)}</p>
<p>Signed up for: <b>${esc(row.magnet)}</b>${report ? ` · audit score ${report.score}/100 · best offer: ${esc(report.offer?.name)}` : ""}${auditError ? ` · audit failed: ${esc(auditError)}` : ""}</p>
<p>Source: ${esc(row.source)} ${row.utm ? esc(JSON.stringify(row.utm)) : ""}</p>`);
  })().catch((e) => console.error("optin emails failed:", e));
  try { (c.executionCtx as any).waitUntil(emails); } catch { await emails; }

  return c.json({ ok: true, report, calculatorPlan: row.magnet === "missed-call-calculator" });
});
