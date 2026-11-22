-- Additive fix-up for the Oct 31 schema (tables existed with RLS on but no
-- policies and no id/timestamp defaults). Nothing is dropped.
do $$
declare t text;
begin
  foreach t in array array['leads','leadScores','generatedAssets','outreachSequences',
    'outreachAnalytics','invoices','invoiceReminders','agentRuns','affiliates',
    'affiliateReferrals','subscribers'] loop
    execute format('alter table public.%I alter column "id" set default gen_random_uuid()::text', t);
    execute format('alter table public.%I add column if not exists "createdAt" text', t);
    execute format('alter table public.%I alter column "createdAt" set default to_char(now() at time zone ''utc'', ''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'')', t);
    execute format('alter table public.%I add column if not exists "updatedAt" text', t);
    execute format('alter table public.%I alter column "updatedAt" set default to_char(now() at time zone ''utc'', ''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'')', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Tenant tables: signed-in users get full access to their own rows only.
  foreach t in array array['leads','leadScores','generatedAssets','outreachSequences',
    'outreachAnalytics','invoices','invoiceReminders','agentRuns'] loop
    execute format('alter table public.%I alter column "userId" set default (auth.uid())::text', t);
    execute format($p$create policy own_rows on public.%I for all to authenticated
      using ("userId" = (select auth.uid())::text)
      with check ("userId" = (select auth.uid())::text)$p$, t);
  end loop;
end $$;

alter table "agentRuns" alter column "startedAt" set default to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
alter table "generatedAssets" alter column "generatedAt" set default to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new."updatedAt" = to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['leads','leadScores','generatedAssets','outreachSequences',
    'outreachAnalytics','invoices','invoiceReminders','agentRuns','affiliates',
    'affiliateReferrals','subscribers'] loop
    execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Owner-only browser reads; writes go through the backend (service role).
create policy owner_read on "affiliates" for select to authenticated
  using ((select auth.jwt()) ->> 'email' = 'memberebma@gmail.com');
create policy owner_read on "affiliateReferrals" for select to authenticated
  using ((select auth.jwt()) ->> 'email' = 'memberebma@gmail.com');
create policy own_or_owner_read on "subscribers" for select to authenticated
  using ("userId" = (select auth.uid())::text
         or (select auth.jwt()) ->> 'email' = 'memberebma@gmail.com');

create index if not exists leads_user_status on "leads" ("userId", "status");
create index if not exists scores_user_lead on "leadScores" ("userId", "leadId");
create index if not exists assets_user_lead on "generatedAssets" ("userId", "leadId");
create index if not exists seq_user_lead on "outreachSequences" ("userId", "leadId");
create index if not exists events_user on "outreachAnalytics" ("userId");
create index if not exists invoices_user_status on "invoices" ("userId", "status");
create index if not exists invoices_stripe on "invoices" ("stripeInvoiceId");
create index if not exists reminders_user_invoice on "invoiceReminders" ("userId", "invoiceId");
create index if not exists runs_user_status on "agentRuns" ("userId", "status");
create index if not exists referrals_affiliate on "affiliateReferrals" ("affiliateId");
create index if not exists subscribers_sub on "subscribers" ("stripeSubscriptionId");
