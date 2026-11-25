/**
 * Offer ladder: which paid offer a lead is most likely to buy, from real
 * Google Maps signals. Recurring offers (monthlyPrice > 0) are billed as a
 * Stripe subscription; setupPrice is charged once on the first invoice.
 */
export type OfferId = "site_build" | "review_growth" | "missed_call" | "local_seo";

export interface Offer {
  id: OfferId;
  name: string;
  setupPrice: number;
  monthlyPrice: number;
  /** One line on why this lead fits, with their real numbers. */
  reason: string;
  /** What the outreach email should sell, in plain words. */
  pitch: string;
}

export interface OfferSignals {
  website?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  open24h?: boolean | null;
}

export const OFFERS: Record<OfferId, Omit<Offer, "reason">> = {
  site_build: {
    id: "site_build", name: "Website build + monthly care", setupPrice: 497, monthlyPrice: 49,
    pitch: "a professional website built in 7 days, plus hosting and updates every month",
  },
  review_growth: {
    id: "review_growth", name: "Review growth plan", setupPrice: 0, monthlyPrice: 197,
    pitch: "an automatic review-request system that turns happy customers into new Google reviews every month",
  },
  missed_call: {
    id: "missed_call", name: "Missed-call text-back", setupPrice: 0, monthlyPrice: 197,
    pitch: "instant text-back to every missed call, so after-hours emergency callers don't move on to the next plumber",
  },
  local_seo: {
    id: "local_seo", name: "Google profile & local SEO management", setupPrice: 0, monthlyPrice: 497,
    pitch: "monthly Google Business Profile and local SEO management to keep them at the top of the map",
  },
};

// Free page builders count as "no real website" — the owner is still a site-build prospect.
const FREE_SITE_HOSTS = /(^|\.)(sites\.google\.com|business\.site|voolt\.com|jobbersites\.com|wixsite\.com|godaddysites\.com|square\.site|weebly\.com|carrd\.co|linktr\.ee|facebook\.com)$/i;

export function isFreeOrMissingWebsite(website?: string | null): boolean {
  if (!website || !website.trim()) return true;
  try {
    const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname;
    return FREE_SITE_HOSTS.test(host);
  } catch {
    return false;
  }
}

export function matchOffer(s: OfferSignals): Offer {
  const reviews = Number(s.reviewCount) || 0;
  const rating = Number(s.rating) || 0;
  const pick = (id: OfferId, reason: string): Offer => ({ ...OFFERS[id], reason });

  if (isFreeOrMissingWebsite(s.website)) {
    return pick("site_build", s.website ? "Only a free page-builder site" : `No website${reviews ? ` despite ${reviews} Google reviews` : ""}`);
  }
  if (reviews < 20 || (rating > 0 && rating < 4)) {
    return pick("review_growth", rating > 0 && rating < 4 ? `Rated ${rating}★ with ${reviews} reviews` : `Only ${reviews} Google reviews`);
  }
  if (s.open24h) return pick("missed_call", "Advertises 24-hour emergency service");
  if (reviews >= 50) return pick("local_seo", `Established: ${reviews} reviews, ${rating}★`);
  return pick("review_growth", `${reviews} reviews — room to pull ahead of local competitors`);
}

/** First-year value of an offer, used as the lead's potential services value. */
export function firstYearValue(o: Pick<Offer, "setupPrice" | "monthlyPrice">): number {
  return o.setupPrice + o.monthlyPrice * 12;
}

export function isOfferId(id: unknown): id is OfferId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(OFFERS, id);
}

/**
 * Stripe Checkout settings for a public (logged-out) offer purchase from the free audit.
 * Prices always come from OFFERS on the server, never from the browser. Monthly price is a
 * subscription; setupPrice is a one-time line on the first invoice.
 */
export function offerCheckoutParams(offerId: OfferId, opts: { siteUrl: string; business?: string; email?: string }) {
  const o = OFFERS[offerId];
  const business = (opts.business || "").slice(0, 120);
  const line_items: Array<Record<string, unknown>> = [{
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: o.monthlyPrice * 100,
      recurring: { interval: "month" },
      product_data: { name: `AImHighAI: ${o.name}` },
    },
  }];
  if (o.setupPrice > 0) {
    line_items.push({
      quantity: 1,
      price_data: { currency: "usd", unit_amount: o.setupPrice * 100, product_data: { name: `${o.name}: one-time setup` } },
    });
  }
  const metadata = { source: "free-audit", offerId, business };
  return {
    mode: "subscription" as const,
    line_items,
    customer_email: opts.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.email) ? opts.email : undefined,
    success_url: `${opts.siteUrl}/free-audit?paid=1&offer=${offerId}`,
    cancel_url: `${opts.siteUrl}/free-audit?canceled=1`,
    allow_promotion_codes: true,
    metadata,
    subscription_data: { metadata },
  };
}
