-- ============================================================
--  Adds a service fee, as a percentage of what a client is billed.
--
--  The owner types one number in Settings — 10 means 10%. Every client
--  page then adds that percentage on top of the items total, shows it
--  as its own line, and asks for the sum. Set it to 0 and nothing about
--  the app changes.
--
--  The percentage has to come back from this function rather than from
--  the settings table: the client page is anonymous and RLS blocks it
--  from reading settings at all.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

alter table public.settings
  add column if not exists service_fee_pct numeric(5,2) not null default 0;

-- Dropped first so re-running this file after changing the bounds works.
alter table public.settings drop constraint if exists settings_service_fee_pct_range;
alter table public.settings add constraint settings_service_fee_pct_range
  check (service_fee_pct >= 0 and service_fee_pct <= 100);

-- ------------------------------------------------------------
-- Client page function, now returning the percentage.
--
-- Only the percentage: the amount is worked out in the page from the
-- prices it already has, so there is no second figure to disagree with
-- the first. Still hand-picked columns — no cost, no private notes.
-- ------------------------------------------------------------
create or replace function public.get_client_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select json_build_object(
    'client', json_build_object(
      'name', c.name
    ),
    'fee_pct', coalesce((select s.service_fee_pct from public.settings s where s.id), 0),
    'payment', (
      select json_build_object(
        'en',           s.payment_note_en,
        'ar',           s.payment_note_ar,
        'method',       s.pay_method,
        'account',      s.pay_account,
        'account_name', s.pay_account_name,
        'whatsapp',     s.owner_whatsapp
      )
      from public.settings s
      where s.id
    ),
    'items', coalesce((
      select json_agg(
        json_build_object(
          'id',            i.id,
          'description',   i.description,
          'specs',         i.specs,
          'budget',        i.budget,
          'status',        i.status,
          'price',         i.price,
          'deposit',       i.deposit,
          'request_photo', i.request_photo,
          'found_photo',   i.found_photo,
          'created_at',    i.created_at
        )
        order by i.created_at desc
      )
      from public.items i
      where i.client_id = c.id
        and i.status <> 'closed'          -- finished orders drop off the link
    ), '[]'::json)
  )
  into result
  from public.clients c
  where c.token = p_token;

  return result;
end;
$$;

revoke all on function public.get_client_by_token(text) from public;
grant execute on function public.get_client_by_token(text) to anon, authenticated;
