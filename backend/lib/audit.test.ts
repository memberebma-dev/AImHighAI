import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAudit, sameBusiness, auditHtml } from "./audit.js";
import type { PlaceResult } from "./maps.js";

const place = (companyName: string, reviewCount: number, rating = 4.6, website = "https://example.com", open24h = false): PlaceResult =>
  ({ companyName, reviewCount, rating, website, open24h, phone: "", address: "", placeId: companyName });

test("sameBusiness ignores case, punctuation and LLC", () => {
  assert.equal(sameBusiness("Joe's Plumbing LLC", "joes plumbing"), true);
  assert.equal(sameBusiness("Joe's Plumbing", "Ace Rooter"), false);
});

test("not found on Maps -> score 0, site-build offer, claim-profile fix first", () => {
  const r = buildAudit("Ghost Plumbing", "Hattiesburg, MS", null, [place("Big Co", 300)]);
  assert.equal(r.found, false);
  assert.equal(r.score, 0);
  assert.equal(r.offer?.id, "site_build");
  assert.match(r.topFixes[0], /Google Business Profile/);
  assert.equal(r.competitors[0].name, "Big Co");
});

test("few reviews and no website -> bad findings, fixes ordered worst first", () => {
  const market = [place("Big Co", 300), place("Mid Co", 120), place("Small Co", 80), place("Joe's Plumbing", 6, 4.8, "")];
  const r = buildAudit("Joes Plumbing", "Hattiesburg, MS", market[3], market);
  assert.equal(r.found, true);
  assert.equal(r.findings.find((f) => f.area === "reviews")?.severity, "bad");
  assert.equal(r.findings.find((f) => f.area === "website")?.severity, "bad");
  assert.equal(r.offer?.id, "site_build");
  assert.equal(r.topFixes.length, 3);
  assert.equal(r.competitors.length, 3);
  assert.ok(!r.competitors.some((c) => c.name === "Joe's Plumbing"));
  assert.ok(r.score < 50, `score ${r.score} should be low`);
});

test("top-ranked business with strong reviews scores high", () => {
  const market = [place("Joe's Plumbing", 400, 4.9), place("Mid Co", 120), place("Small Co", 80)];
  const r = buildAudit("Joe's Plumbing", "X", market[0], market);
  assert.equal(r.findings.find((f) => f.area === "maps")?.severity, "good");
  assert.equal(r.findings.find((f) => f.area === "reviews")?.severity, "good");
  assert.ok(r.score >= 75, `score ${r.score} should be high`);
});

test("auditHtml escapes business names", () => {
  const r = buildAudit("<script>", "X", null, []);
  assert.ok(!auditHtml(r, "https://s").includes("<script>"));
});
