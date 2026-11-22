# AImHighAI security SOP

Plain-language runbook. Owner: Aamber. Review every 3 months.

## Daily / weekly habits
- **Never paste keys into chat, docs, screenshots or code.** Keys live only in Vercel → Settings → Environment Variables, marked Sensitive.
- Weekly: open https://aimhighai.vercel.app/api/health. Every line should say `ok: true`.
- Weekly: Supabase → Advisors (Security + Performance). Fix anything red.
- Turn on 2-step login (authenticator app, not SMS) for: GitHub, Vercel, Supabase, Stripe, Resend, Google, Cloudflare, Treg, OpenAI, Groq.

## What's already in place
- HTTPS + HSTS, clickjacking and sniffing blocked (`vercel.json` headers).
- Row-level security on every table; `optins` has no public policy (server-only).
- Keys trimmed and read server-side only; `/api/health` never returns secret values.
- Public opt-in form: honeypot, strict validation, 8 KB size cap.
- `/.well-known/security.txt` and `/security` for vulnerability reports.

## If you think you've been hacked (incident steps)
1. **Contain (first 15 min):** roll the key that might be exposed. Stripe: Developers → API keys → Roll. Supabase: Settings → API → rotate service role. Then update it in Vercel and click Redeploy.
2. **Check money:** Stripe → Payments and Payouts for anything you don't recognise. Change the payout bank only from inside Stripe.
3. **Check access:** GitHub → Settings → Sessions / Collaborators; Vercel → Team members; Supabase → Team. Remove anyone you don't know.
4. **Roll back the site if it's defaced:** Vercel → Deployments → pick the last good one → "Promote to Production". (Every deploy is kept, so this is instant and reversible.)
5. **Look at logs:** Vercel → Logs (filter 4xx/5xx); Supabase → Logs → Auth.
6. **Tell people if personal data leaked.** Most US states require notice to affected people "without unreasonable delay". Talk to a lawyer before sending.
7. **Write it down:** date, what happened, what you changed. Keep it in this folder as `incident-YYYY-MM-DD.md`.

## Keys that have been exposed and must be rolled
The keys pasted into chat on Nov 2026 (Stripe live secret + restricted, OpenAI, Groq, SendGrid, Resend, Treg) should all be rolled once, then updated in Vercel.

## Still to do
- Add Vercel Firewall rate limit on `/api/optin` (Vercel → Firewall → Add rule: path `/api/optin`, 10 requests / minute / IP).
- Set up a business inbox (e.g. hello@aimhighai.net) and swap it in for the personal email on the legal pages.
- Have a lawyer review the Privacy Policy and Terms before heavy paid traffic.
