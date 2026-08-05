-- ============================================================
--  Adds a "closed" status.
--
--  Closed means: delivered, paid, finished. The item stays in your
--  dashboard, your totals and your reports, but it is no longer sent
--  to the client's page at all — so a returning customer opening their
--  link sees only their current order, not last month's.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

alter table public.items drop constraint if exists items_status_check;

alter table public.items add constraint items_status_check
  check (status in (
    'requested',
    'sourcing',
    'found',
    'bought',
    'shipped',
    'out_for_delivery',
    'delivered',
    'closed',
    'canceled'
  ));

-- ------------------------------------------------------------
-- Client page function: closed items are filtered out in the database,
-- so they never reach the browser at all.
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
