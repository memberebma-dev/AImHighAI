import { test } from "node:test";
import assert from "node:assert/strict";
import { matchOffer, isFreeOrMissingWebsite, firstYearValue, offerCheckoutParams, isOfferId } from "./offers.js";

// Cases taken from the real Hattiesburg, MS treg search.
test("no website → site build", () => {
  const o = matchOffer({ website: null, rating: 4.9, reviewCount: 45 });
  assert.equal(o.id, "site_build");
  assert.equal(o.reason, "No website despite 45 Google reviews");
  assert.equal(firstYearValue(o), 497 + 49 * 12);
});

test("free page builder counts as no real website", () => {
  assert.equal(isFreeOrMissingWebsite("https://sites.google.com/view/billsplumbing"), true);
  assert.equal(isFreeOrMissingWebsite("https://jwplumbingandhandyman.voolt.com/"), true);
  assert.equal(isFreeOrMissingWebsite("https://drainagainms.com/"), false);
  assert.equal(matchOffer({ website: "https://sites.google.com/view/x", reviewCount: 52 }).id, "site_build");
});

test("real site but few reviews or low rating → review growth", () => {
  assert.equal(matchOffer({ website: "https://a.com", rating: 5, reviewCount: 5 }).id, "review_growth");
  const low = matchOffer({ website: "https://a.com", rating: 3.2, reviewCount: 69 });
  assert.equal(low.id, "review_growth");
  assert.equal(low.reason, "Rated 3.2★ with 69 reviews");
});

test("healthy reviews and 24h service → missed-call text-back", () => {
  assert.equal(matchOffer({ website: "https://a.com", rating: 4.9, reviewCount: 174, open24h: true }).id, "missed_call");
});

test("established, not 24h → local SEO management", () => {
  const o = matchOffer({ website: "https://a.com", rating: 4.7, reviewCount: 52 });
  assert.equal(o.id, "local_seo");
  assert.equal(o.monthlyPrice, 497);
});

test("mid-size healthy profile falls back to review growth", () => {
  assert.equal(matchOffer({ website: "https://a.com", rating: 4.5, reviewCount: 30 }).id, "review_growth");
});

test("offerCheckoutParams: monthly subscription, setup fee as one-time line", () => {
  const p = offerCheckoutParams("site_build", { siteUrl: "https://x.app", business: "Joe's", email: "a@b.co" });
  assert.equal(p.mode, "subscription");
  assert.equal(p.line_items.length, 2);
  assert.deepEqual((p.line_items[0] as any).price_data.recurring, { interval: "month" });
  assert.equal((p.line_items[0] as any).price_data.unit_amount, 4900);
  assert.equal((p.line_items[1] as any).price_data.unit_amount, 49700);
  assert.equal((p.line_items[1] as any).price_data.recurring, undefined);
  assert.equal(p.metadata.source, "free-audit");
  assert.equal(p.customer_email, "a@b.co");
  assert.match(p.success_url, /^https:\/\/x\.app\/free-audit\?paid=1/);
});

test("offerCheckoutParams: no setup line when setup is free; bad email dropped", () => {
  const p = offerCheckoutParams("missed_call", { siteUrl: "https://x.app", email: "nope" });
  assert.equal(p.line_items.length, 1);
  assert.equal((p.line_items[0] as any).price_data.unit_amount, 19700);
  assert.equal(p.customer_email, undefined);
});

test("isOfferId only accepts real offers", () => {
  assert.equal(isOfferId("local_seo"), true);
  assert.equal(isOfferId("free_money"), false);
  assert.equal(isOfferId("toString"), false);
});
