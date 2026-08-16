-- ============================================================
--  Lets one client be charged a different service fee percentage.
--
--  Settings still holds the rate everybody pays. This column is an
--  exception on a single client: null means "whatever Settings says",
--  a number means that number, and 0 means this client pays no fee at
--  all — which is why it has to be nullable rather than defaulting to 0.
--
--  Nothing is copied onto the item at save time, exactly as with the
--  Settings percentage: changing a client's rate changes what their
--  open, unpaid orders come to.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

alter table public.clients
  add column if not exists service_fee_pct numeric(5,2);

-- Dropped first so re-running this file after changing the bounds works.
alter table public.clients drop constraint if exists clients_service_fee_pct_range;
alter table public.clients add constraint clients_service_fee_pct_range
  check (service_fee_pct is null or (service_fee_pct >= 0 and service_fee_pct <= 100));

-- ------------------------------------------------------------
-- Client page function: the percentage it returns is now resolved.
--
-- The page receives one number and never learns whether it came from
-- this client or from Settings — there is nothing to say about that on
-- the client's side. Same signature as before, so the deployed page
-- keeps working through the gap between running this and deploying.
-- Still hand-picked columns — no cost, no private notes.
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
    'fee_pct', coalesce(
      c.service_fee_pct,
      (select s.service_fee_pct from public.settings s where s.id),
      0
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
