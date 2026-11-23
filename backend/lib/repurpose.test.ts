import { test } from "node:test";
import assert from "node:assert/strict";
import { cityFromAddress, pickCompetitors, discounted, repurposedOffer, buildNoHardFeelingsEmail } from "./repurpose.js";
import type { PlaceResult } from "./maps.js";

const place = (companyName: string, reviewCount: number, extra: Partial<PlaceResult> = {}): PlaceResult => ({
  companyName, website: "https://x.com", phone: "", address: "", rating: 4.5, reviewCount, placeId: companyName, ...extra,
});

test("city from a full street address", () => {
  assert.equal(cityFromAddress("2921 N Ct St, Ottumwa, IA 52501"), "Ottumwa, IA");
  assert.equal(cityFromAddress("717 E Williams St, Ottumwa, IA 52501, USA"), "Ottumwa, IA");
  assert.equal(cityFromAddress("Southern California"), "Southern California");
  assert.equal(cityFromAddress(""), "");
});

test("competitors exclude the lost lead, known pipeline names and duplicates; most reviews first", () => {
  const places = [
    place("Lost Plumbing", 300),
    place("Small Co", 5),
    place("Big Co", 120),
    place("Already Pitched", 200),
    place("big co", 90),
    place("Mid Co", 40),
  ];
  const picked = pickCompetitors(places, { companyName: "lost plumbing" }, new Set(["already pitched"]), 3);
  assert.deepEqual(picked.map((p) => p.companyName), ["Big Co", "Mid Co", "Small Co"]);
});

test("competitor with the same Google place id as the lost lead is skipped", () => {
  const picked = pickCompetitors([place("Renamed Listing", 50, { placeId: "abc" })], { companyName: "Lost", placeId: "abc" }, new Set());
  assert.equal(picked.length, 0);
});

test("discount rounds to whole dollars and is clamped", () => {
  assert.equal(discounted(497, 20), 398);
  assert.equal(discounted(197, 0), 197);
  assert.equal(discounted(100, -10), 100);
  assert.equal(discounted(100, 100), 10);
});

test("repurposed offer comes from the competitor's own data, priced lower", () => {
  const o = repurposedOffer(place("No Site Co", 30, { website: "" }), 20);
  assert.equal(o.id, "site_build");
  assert.equal(o.setupPrice, 398);
  assert.equal(o.monthlyPrice, 39);
});

test("no-hard-feelings email names the competitor and the offer", () => {
  const e = buildNoHardFeelingsEmail({ companyName: "Lost Plumbing", offerName: "Website build + monthly care" }, "Big Co");
  assert.match(e.body, /No hard feelings/);
  assert.match(e.body, /website build \+ monthly care to Big Co/);
  assert.match(e.subject, /Lost Plumbing/);
  assert.match(buildNoHardFeelingsEmail({ companyName: "X" }).body, /the plan we put together to other businesses nearby/);
});
