-- Lost-lead repurposing: mark lost leads already repurposed, and link each
-- competitor lead back to the lost lead it came from.
alter table "leads" add column if not exists "repurposedAt" timestamptz;
alter table "leads" add column if not exists "repurposedFrom" text;
create index if not exists leads_user_lost_unrepurposed on "leads" ("userId") where "status" = 'lost' and "repurposedAt" is null;
