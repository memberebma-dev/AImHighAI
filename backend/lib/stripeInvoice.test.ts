import { test } from "node:test";
import assert from "node:assert/strict";
import { ensurePrice, createRetainerSubscription } from "./stripeInvoice.js";

function fakeStripe(existingLookupKeys: string[] = [], invoiceStatus = "draft") {
  const calls: any = { pricesCreate: [], subsCreate: [], finalized: [] };
  const stripe: any = {
    prices: {
      list: async ({ lookup_keys }: any) => ({ data: existingLookupKeys.includes(lookup_keys[0]) ? [{ id: `existing_${lookup_keys[0]}` }] : [] }),
      create: async (p: any) => { calls.pricesCreate.push(p); return { id: `price_${p.lookup_key}` }; },
    },
    subscriptions: { create: async (p: any) => { calls.subsCreate.push(p); return { id: "sub_1", latest_invoice: "in_1" }; } },
    invoices: {
      retrieve: async () => ({ id: "in_1", status: invoiceStatus }),
      finalizeInvoice: async (id: string) => { calls.finalized.push(id); return { id, status: "open", hosted_invoice_url: "https://pay" }; },
    },
  };
  return { stripe, calls };
}

test("ensurePrice reuses an existing price for the same offer and amount", async () => {
  const { stripe, calls } = fakeStripe(["agentorch_local_seo_monthly_49700"]);
  const p = await ensurePrice(stripe, { offerId: "local_seo", name: "SEO", amountCents: 49700, monthly: true });
  assert.equal(p.id, "existing_agentorch_local_seo_monthly_49700");
  assert.equal(calls.pricesCreate.length, 0);
});

test("site build: $49/mo subscription with $497 setup on the first invoice, finalized", async () => {
  const { stripe, calls } = fakeStripe();
  const r = await createRetainerSubscription(stripe, { customerId: "cus_1", offerId: "site_build", offerName: "Website", monthlyCents: 4900, setupCents: 49700 });
  assert.deepEqual(calls.pricesCreate.map((p: any) => [p.unit_amount, !!p.recurring]), [[4900, true], [49700, false]]);
  const sub = calls.subsCreate[0];
  assert.equal(sub.collection_method, "send_invoice");
  assert.deepEqual(sub.items, [{ price: "price_agentorch_site_build_monthly_4900" }]);
  assert.deepEqual(sub.add_invoice_items, [{ price: "price_agentorch_site_build_setup_49700" }]);
  assert.deepEqual(calls.finalized, ["in_1"]);
  assert.equal(r.invoice.hosted_invoice_url, "https://pay");
});

test("monthly-only offer has no setup item and leaves an open invoice alone", async () => {
  const { stripe, calls } = fakeStripe([], "open");
  await createRetainerSubscription(stripe, { customerId: "cus_1", offerId: "review_growth", offerName: "Reviews", monthlyCents: 19700, setupCents: 0 });
  assert.equal(calls.subsCreate[0].add_invoice_items, undefined);
  assert.deepEqual(calls.finalized, []);
});
