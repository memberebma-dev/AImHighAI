/**
 * Lost-lead repurposing: when a lead goes "lost", pitch the same offer to its
 * nearest competitors at a lower price, and send the lost lead one last
 * "no hard feelings" note. Pure helpers live here so they can be tested; the
 * database/AI side runs in routes/orchestrator.ts.
 */
import type { PlaceResult } from "./maps.js";
import { matchOffer, type Offer } from "./offers.js";

/** Competitors pitched per lost lead. */
export const MAX_COMPETITORS = 5;
/** Default discount off the lost lead's price, in percent. */
export const DEFAULT_DISCOUNT_PCT = 20;
/** Lost leads repurposed per batch run, to cap AI and email cost. */
export const BATCH_LIMIT = 3;

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

/**
 * "2921 N Ct St, Ottumwa, IA 52501" → "Ottumwa, IA". Falls back to the input
 * when it isn't a street address (e.g. "Southern California").
 */
export function cityFromAddress(address?: string | null): string {
  const parts = (address || "").split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const state = parts[parts.length - 1].replace(/\s*\d{5}(-\d{4})?$/, "").trim();
    const city = parts[parts.length - 2];
    if (/^(usa|united states)$/i.test(state)) return cityFromAddress(parts.slice(0, -1).join(", "));
    return state ? `${city}, ${state}` : city;
  }
  return (address || "").trim();
}

/**
 * Picks up to `max` competitors of the lost lead: never the lead itself, never
 * a business already in the pipeline, best-established first (most reviews),
 * since they have the budget and the most to lose.
 */
export function pickCompetitors(
  places: PlaceResult[],
  lost: { companyName?: string; placeId?: string },
  excludeNames: Set<string>,
  max = MAX_COMPETITORS
): PlaceResult[] {
  const lostName = norm(lost.companyName);
  const seen = new Set<string>();
  return places
    .filter((p) => {
      const name = norm(p.companyName);
      if (!name || name === lostName || excludeNames.has(name) || seen.has(name)) return false;
      if (lost.placeId && p.placeId === lost.placeId) return false;
      seen.add(name);
      return true;
    })
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, max);
}

/** Whole-dollar price after a discount, clamped to 0–90% so it never hits zero. */
export function discounted(price: number, pct: number): number {
  const p = Math.min(Math.max(Number(pct) || 0, 0), 90);
  return Math.round((Number(price) || 0) * (1 - p / 100));
}

/** The competitor's own offer (from its own Maps data), priced below list. */
export function repurposedOffer(place: PlaceResult, discountPct = DEFAULT_DISCOUNT_PCT): Offer {
  const offer = matchOffer(place);
  return { ...offer, setupPrice: discounted(offer.setupPrice, discountPct), monthlyPrice: discounted(offer.monthlyPrice, discountPct) };
}

/**
 * Last note to the lost lead. Names the competitor we'll offer it to, so the
 * lead knows the spot is being given away; stays polite and leaves the door open.
 */
export function buildNoHardFeelingsEmail(
  lead: { companyName: string; offerName?: string | null },
  competitorName?: string
): { subject: string; body: string } {
  const what = lead.offerName ? `the ${lead.offerName.toLowerCase()}` : "the plan we put together";
  const who = competitorName ? `${competitorName} and other businesses nearby` : "other businesses nearby";
  return {
    subject: `Closing out ${lead.companyName}'s file`,
    body: [
      `No hard feelings at all. It sounds like now isn't the right time for ${lead.companyName}.`,
      `Since we already did the research for your area, we're going to offer ${what} to ${who} instead.`,
      `If you'd like to claim it before they do, just reply to this email and it's yours. Otherwise, we wish you a great season.`,
    ].join("\n"),
  };
}
