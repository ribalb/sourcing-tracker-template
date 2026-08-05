-- ============================================================
--  Makes the "How to pay" box interactive.
--
--  Adds structured payment details so the client can copy the account
--  number and the exact amount with one tap, and message you when they
--  have sent it — instead of retyping a number out of a paragraph.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

alter table public.settings
  add column if not exists pay_method       text,   -- "Whish", "OMT", "Bank transfer"
  add column if not exists pay_account      text,   -- "1548-5854"
  add column if not exists pay_account_name text,   -- name the account is under
  add column if not exists owner_whatsapp   text;   -- your number, for the "I've paid" button

-- ------------------------------------------------------------
-- Re-create the client page function so it returns the new fields.
-- Still hand-picked columns: no cost, no private notes.
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
          'id',          i.id,
          'description', i.description,
          'specs',       i.specs,
          'budget',      i.budget,
          'status',      i.status,
          'price',       i.price,
          'deposit',     i.deposit,
          'created_at',  i.created_at
        )
        order by i.created_at desc
      )
      from public.items i
      where i.client_id = c.id
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
