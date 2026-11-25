// Lead Leak Audit: turns real Google Maps data for one business (and its local
// competitors) into a plain-English report with a score and the top 3 fixes.
import { matchOffer, isFreeOrMissingWebsite, type Offer } from "./offers.js";
import { placeFromTregRow, type PlaceResult } from "./maps.js";

export type Severity = "good" | "warn" | "bad";

export interface AuditFinding {
  area: "maps" | "reviews" | "website" | "missed_calls";
  severity: Severity;
  headline: string;
  detail: string;
  fix?: string;
}

export interface AuditReport {
  found: boolean;
  business: string;
  city: string;
  score: number;
  findings: AuditFinding[];
  topFixes: string[];
  offer: Offer | null;
  competitors: { name: string; rating: number; reviewCount: number }[];
}

const normalize = (s: string) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** True when two business names refer to the same place ("Joe's Plumbing LLC" ~ "joes plumbing"). */
export function sameBusiness(a: string, b: string): boolean {
  const x = normalize(a).replace(/\b(llc|inc|co|company|the)\b/g, "").trim();
  const y = normalize(b).replace(/\b(llc|inc|co|company|the)\b/g, "").trim();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

const POINTS: Record<Severity, number> = { good: 25, warn: 12, bad: 0 };

export function buildAudit(business: string, city: string, target: PlaceResult | null, others: PlaceResult[]): AuditReport {
  const competitors = others
    .filter((p) => !target || !sameBusiness(p.companyName, target.companyName))
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 3)
    .map((p) => ({ name: p.companyName, rating: p.rating, reviewCount: p.reviewCount }));
  const avgReviews = competitors.length ? Math.round(competitors.reduce((s, c) => s + c.reviewCount, 0) / competitors.length) : 0;

  if (!target) {
    const findings: AuditFinding[] = [{
      area: "maps", severity: "bad",
      headline: "We couldn't find you on Google Maps",
      detail: `A search for "${business}" in ${city} didn't return your business. Customers searching nearby likely can't find you either.`,
      fix: "Claim or create your free Google Business Profile at business.google.com and verify it.",
    }];
    return {
      found: false, business, city, score: 0, findings,
      topFixes: [findings[0].fix!, "Add your hours, service area, phone and 10+ real photos.", "Ask your last 10 happy customers for a Google review."],
      offer: matchOffer({ website: "", reviewCount: 0 }), competitors,
    };
  }

  const findings: AuditFinding[] = [];
  const rank = others.findIndex((p) => sameBusiness(p.companyName, target.companyName));
  findings.push(rank >= 0 && rank < 3
    ? { area: "maps", severity: "good", headline: `You show up #${rank + 1} on the map`, detail: `For your service in ${city}, you're in the top 3 results people see first.` }
    : { area: "maps", severity: rank >= 0 ? "warn" : "bad",
        headline: rank >= 0 ? `You show up #${rank + 1}, below the top 3` : "You're not in the main local results",
        detail: "Most callers pick from the first three businesses on the map.",
        fix: "Fill out every field of your Google Business Profile and post a photo or update every week." });

  const r = target.reviewCount, stars = target.rating;
  if (r < 20 || (stars > 0 && stars < 4)) {
    findings.push({ area: "reviews", severity: "bad", headline: `${r} reviews${stars ? `, ${stars}★` : ""}`,
      detail: avgReviews ? `The top competitors near you average ${avgReviews} reviews.` : "Fewer than 20 reviews makes new customers hesitate.",
      fix: "Text every happy customer a direct review link the same day you finish the job." });
  } else if (avgReviews && r < avgReviews) {
    findings.push({ area: "reviews", severity: "warn", headline: `${r} reviews, ${stars}★`,
      detail: `Solid, but the top competitors near you average ${avgReviews}.`,
      fix: "Set up automatic review requests after every job to close the gap." });
  } else {
    findings.push({ area: "reviews", severity: "good", headline: `${r} reviews, ${stars}★`, detail: "You're ahead of or level with local competitors." });
  }

  if (isFreeOrMissingWebsite(target.website)) {
    findings.push({ area: "website", severity: "bad", headline: target.website ? "Only a free page-builder site" : "No website listed",
      detail: "Many customers check a website before calling. Without a real one, they call whoever has one.",
      fix: "Get a simple, fast, mobile-first website with a big tap-to-call button." });
  } else {
    findings.push({ area: "website", severity: "good", headline: "You have a website", detail: target.website });
  }

  findings.push(target.open24h
    ? { area: "missed_calls", severity: "warn", headline: "You advertise 24-hour service",
        detail: "Night and weekend callers who reach voicemail usually call the next business.",
        fix: "Turn on missed-call text back so every missed caller gets a reply in seconds." }
    : { area: "missed_calls", severity: "warn", headline: "No missed-call safety net detected",
        detail: "When you're on a job and can't pick up, most callers don't leave a voicemail.",
        fix: "Turn on missed-call text back so every missed caller gets a reply in seconds." });

  const score = Math.round(findings.reduce((s, f) => s + POINTS[f.severity], 0));
  const order: Record<Severity, number> = { bad: 0, warn: 1, good: 2 };
  const topFixes = [...findings].sort((a, b) => order[a.severity] - order[b.severity]).filter((f) => f.fix).slice(0, 3).map((f) => f.fix!);

  return {
    found: true, business: target.companyName, city, score, findings, topFixes,
    offer: matchOffer({ website: target.website, rating: stars, reviewCount: r, open24h: target.open24h }),
    competitors,
  };
}

/** Looks the business and its local competitors up on Google Maps via treg, then builds the report. */
export async function runAudit(token: string, org: string, business: string, city: string, trade: string): Promise<AuditReport> {
  const call = async (query: string, limit: number): Promise<PlaceResult[]> => {
    const res = await fetch("https://treg.to/call/crawl4ai.google.serp.maps", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Treg-Token": token, ...(org ? { "X-Treg-Org": org } : {}) },
      body: JSON.stringify({ query, location: city, limit }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`Maps lookup failed (HTTP ${res.status})`);
    const data = (await res.json()) as any;
    return (Array.isArray(data?.rows) ? data.rows : []).map((row: any) => placeFromTregRow(row, city)).filter(Boolean) as PlaceResult[];
  };
  const [market, direct] = await Promise.all([call(trade || "plumber", 20), call(business, 5)]);
  const target = market.find((p) => sameBusiness(p.companyName, business)) || direct.find((p) => sameBusiness(p.companyName, business)) || null;
  return buildAudit(business, city, target, market);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const ICON: Record<Severity, string> = { good: "✅", warn: "⚠️", bad: "❌" };

/** Email/HTML rendering of a report. */
export function auditHtml(r: AuditReport, siteUrl: string): string {
  const rows = r.findings.map((f) => `<tr><td style="padding:8px;vertical-align:top">${ICON[f.severity]}</td><td style="padding:8px"><b>${esc(f.headline)}</b><br><span style="color:#555">${esc(f.detail)}</span></td></tr>`).join("");
  const fixes = r.topFixes.map((f) => `<li style="margin:6px 0">${esc(f)}</li>`).join("");
  const offer = r.offer ? `<p style="margin-top:20px">Want it done for you? Our <b>${esc(r.offer.name)}</b> plan fixes this${r.offer.setupPrice ? ` ($${r.offer.setupPrice} setup + $${r.offer.monthlyPrice}/mo)` : ` ($${r.offer.monthlyPrice}/mo)`}. Just reply to this email and we'll set it up.</p>` : "";
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111">
<h2 style="margin-bottom:4px">Your Lead Leak Audit: ${esc(r.business)}</h2>
<p style="color:#555;margin-top:0">${esc(r.city)} · Score <b>${r.score}/100</b></p>
<table style="border-collapse:collapse;width:100%">${rows}</table>
<h3>Your top 3 fixes</h3><ol>${fixes}</ol>${offer}
<p style="font-size:12px;color:#888;margin-top:28px">Based on public Google Maps data at the time of your request. Results vary. <a href="${siteUrl}/disclaimer">Disclaimers</a> · <a href="${siteUrl}/privacy#opt-out">Unsubscribe</a></p></div>`;
}
