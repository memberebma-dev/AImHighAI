import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOptin } from "./optin.js";

const good = { email: "Owner@Plumbing.com ", magnet: "lead-leak-audit", consent: true };

test("accepts a valid opt-in and normalises the email", () => {
  const r = validateOptin(good);
  assert.equal(r.ok, true);
  if (r.ok) { assert.equal(r.bot, false); assert.equal(r.row.email, "owner@plumbing.com"); }
});

test("honeypot filled -> silent success, nothing stored", () => {
  const r = validateOptin({ ...good, hp_extra: "http://spam" });
  assert.equal(r.ok, true);
  if (r.ok) { assert.equal(r.bot, true); assert.deepEqual(r.row, {}); }
});

test("rejects bad email, unknown magnet, missing consent", () => {
  assert.equal(validateOptin({ ...good, email: "nope" }).ok, false);
  assert.equal(validateOptin({ ...good, magnet: "free-iphone" }).ok, false);
  assert.equal(validateOptin({ ...good, consent: "yes" }).ok, false);
});

test("utm/details are trimmed to plain strings and numbers", () => {
  const r = validateOptin({ ...good, utm: { utm_source: "reddit", evil: { a: 1 } }, details: { missedCalls: 12 } });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.row.utm, { utm_source: "reddit" });
    assert.deepEqual(r.row.details, { missedCalls: 12 });
  }
});

test("a browser-autofilled website field is no longer mistaken for a bot", () => {
  const r = validateOptin({ ...good, website: "https://myplumbing.com" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.bot, false);
});
