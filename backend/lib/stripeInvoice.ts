import Stripe from "stripe";

export async function findOrCreateCustomer(
  stripe: Stripe,
  email: string,
  name: string
): Promise<Stripe.Customer> {
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) return existing.data[0];
  }
  return stripe.customers.create({ email: email || undefined, name: name || undefined });
}

/** Create a real Stripe invoice, attach a line item, and finalize it so it's actually payable. */
export async function createAndFinalizeInvoice(
  stripe: Stripe,
  params: { customerId: string; amountCents: number; description: string; daysUntilDue?: number }
): Promise<Stripe.Invoice> {
  await stripe.invoiceItems.create({
    customer: params.customerId,
    amount: params.amountCents,
    currency: "usd",
    description: params.description,
  });
  const draft = await stripe.invoices.create({
    customer: params.customerId,
    collection_method: "send_invoice",
    days_until_due: params.daysUntilDue ?? 7,
    auto_advance: true,
  });
  return stripe.invoices.finalizeInvoice(draft.id!);
}

/**
 * Find or create a Stripe price by lookup key, so each offer/amount pair is
 * created once and reused. The amount is in the key, so changing a price makes
 * a new Stripe price instead of silently reusing the old amount.
 */
export async function ensurePrice(
  stripe: Stripe,
  params: { offerId: string; name: string; amountCents: number; monthly: boolean }
): Promise<Stripe.Price> {
  const lookupKey = `aimhighai_${params.offerId}_${params.monthly ? "monthly" : "setup"}_${params.amountCents}`;
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found.data.length > 0) return found.data[0];
  return stripe.prices.create({
    currency: "usd",
    unit_amount: params.amountCents,
    lookup_key: lookupKey,
    product_data: { name: params.monthly ? params.name : `${params.name} — setup` },
    ...(params.monthly ? { recurring: { interval: "month" as const } } : {}),
  });
}

/**
 * Start a monthly subscription billed by emailed invoice (no card on file
 * needed), with an optional one-time setup fee on the first invoice. Returns
 * the subscription and its first invoice, finalized so it is payable.
 */
export async function createRetainerSubscription(
  stripe: Stripe,
  params: { customerId: string; offerId: string; offerName: string; monthlyCents: number; setupCents: number; daysUntilDue?: number }
): Promise<{ subscription: Stripe.Subscription; invoice: Stripe.Invoice }> {
  const monthly = await ensurePrice(stripe, { offerId: params.offerId, name: params.offerName, amountCents: params.monthlyCents, monthly: true });
  const setup = params.setupCents > 0
    ? await ensurePrice(stripe, { offerId: params.offerId, name: params.offerName, amountCents: params.setupCents, monthly: false })
    : null;
  const subscription = await stripe.subscriptions.create({
    customer: params.customerId,
    collection_method: "send_invoice",
    days_until_due: params.daysUntilDue ?? 7,
    items: [{ price: monthly.id }],
    ...(setup ? { add_invoice_items: [{ price: setup.id }] } : {}),
    metadata: { aimhighai_offer: params.offerId },
  });
  const invoiceId = typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id;
  if (!invoiceId) throw new Error(`Stripe subscription ${subscription.id} has no first invoice`);
  let invoice = await stripe.invoices.retrieve(invoiceId);
  if (invoice.status === "draft") invoice = await stripe.invoices.finalizeInvoice(invoiceId);
  return { subscription, invoice };
}
