import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { placeFromTregRow, discoverLeadsFromMaps } from "./maps.js";

// Shape copied from a real treg crawl4ai.google.serp.maps response (Ottumwa plumbers).
const rows = [
  { name: "D.P. Plumbing Plus LLC", phone: "+1 641-683-4404", website: "https://dpplumbingplusllc.com/", address: "2921 N Ct St, Ottumwa, IA 52501", rating: 3.6, review_count: 59, place_id: "ChIJyx" },
  { name: "Mike Richards Sewer & Drain", phone: "+1 641-682-8843", website: null, address: "717 E Williams St", rating: 4.4, review_count: 50, place_id: "ChIJVQ" },
  { name: "", phone: "x" },
];
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("maps a treg row, turning a null website into empty string", () => {
  const p = placeFromTregRow(rows[1], "Ottumwa, IA")!;
  assert.equal(p.website, "");
  assert.equal(p.reviewCount, 50);
  assert.equal(placeFromTregRow(rows[2], "x"), null);
});

test("uses treg when TREG_TOKEN is set, sends token header, skips known names", async () => {
  let sent: any;
  globalThis.fetch = (async (url: string, init: any) => {
    sent = { url, init };
    return new Response(JSON.stringify({ rows }), { status: 200 });
  }) as any;
  const r = await discoverLeadsFromMaps({ TREG_TOKEN: "t" }, "plumber", "Ottumwa, IA", 10, new Set(["d.p. plumbing plus llc"]));
  assert.equal(sent.init.headers["X-Treg-Token"], "t");
  assert.deepEqual(JSON.parse(sent.init.body).query, "plumber");
  assert.deepEqual(r.places.map((p) => p.companyName), ["Mike Richards Sewer & Drain"]);
});

test("reports treg HTTP errors instead of hiding them", async () => {
  globalThis.fetch = (async () => new Response("no funds", { status: 402 })) as any;
  const r = await discoverLeadsFromMaps({ TREG_TOKEN: "t" }, "plumber", "x", 5);
  assert.equal(r.places.length, 0);
  assert.match(r.diagnostic, /HTTP 402/);
});

test("with no token and no Maps key, says what is missing", async () => {
  const r = await discoverLeadsFromMaps({}, "plumber", "x", 5);
  assert.match(r.diagnostic, /TREG_TOKEN/);
});
