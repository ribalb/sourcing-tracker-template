-- ============================================================
--  Buy in euros or riyals, keep the books in dollars.
--
--  `items.cost` stays exactly what it was: US dollars. Everything that
--  reads it — profit, the dashboard, the exports, the client page —
--  carries on untouched. What is new is a record of what was actually
--  handed over, so "€70" does not disappear into "$75.60" and become
--  unrecognisable three months later.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

-- ------------------------------------------------------------
-- What was paid, before conversion.
--
-- All three are null for a cost paid in dollars: nothing was converted,
-- so there is nothing to remember. `cost` alone tells the whole story.
-- ------------------------------------------------------------
alter table public.items
  add column if not exists cost_currency text,
  add column if not exists cost_original numeric(12,2),
  add column if not exists cost_rate     numeric(12,6);

comment on column public.items.cost_original is
  'The figure as paid, in cost_currency. Null when paid in dollars.';
comment on column public.items.cost_rate is
  'Dollars per one unit of cost_currency, as used at the time. Null when paid in dollars.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'items_cost_currency_check'
  ) then
    alter table public.items
      add constraint items_cost_currency_check
      check (cost_currency is null or cost_currency in ('EUR', 'SAR'));
  end if;
end
$$;

-- ------------------------------------------------------------
-- The rates the item form starts from.
--
-- Deliberately typed in by hand rather than fetched. A rate looked up
-- over patchy signal is a rate that sometimes is not there, and the
-- figure saved on an item should be the one actually paid, not
-- whatever an API happened to say when the form was opened. Each item
-- keeps the rate it used, so changing these never rewrites history.
--
-- The riyal is pegged at 3.75 to the dollar and has been for decades,
-- so 0.2667 is a real default. The euro floats — treat it as a
-- starting guess and correct it after a buying trip.
-- ------------------------------------------------------------
alter table public.settings
  add column if not exists rate_eur numeric(12,6) not null default 1.08,
  add column if not exists rate_sar numeric(12,6) not null default 0.2667;
