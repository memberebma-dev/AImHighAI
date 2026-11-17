import { test } from "node:test";
import assert from "node:assert/strict";
import { matchOffer, isFreeOrMissingWebsite, firstYearValue } from "./offers.js";

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
