-- Offer ladder: Maps signals on leads + the matched offer; subscription link on invoices.
alter table "leads" add column if not exists "rating" double precision;
alter table "leads" add column if not exists "reviewCount" integer;
alter table "leads" add column if not exists "open24h" boolean not null default false;
alter table "leads" add column if not exists "offerId" text;
alter table "leads" add column if not exists "offerName" text;
alter table "leads" add column if not exists "offerReason" text;
alter table "leads" add column if not exists "offerSetup" double precision;
alter table "leads" add column if not exists "offerMonthly" double precision;
alter table "invoices" add column if not exists "stripeSubscriptionId" text;
alter table "invoices" add column if not exists "monthlyAmount" double precision;
