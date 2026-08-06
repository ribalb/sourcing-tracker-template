-- ============================================================
--  A pinned location next to the written address.
--
--  A typed address in Beirut gets you to the street. The pin gets you to
--  the door. Customers already send one on WhatsApp every day, so the
--  request form now asks for both: the address in words, and a map link.
--
--  The link is stored on its own column, not appended to the address.
--  The address is printed on the report and exported to Excel, and a URL
--  smeared across a paper column helps nobody.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

-- ------------------------------------------------------------
-- 1. The column, in both places
-- ------------------------------------------------------------
alter table public.clients  add column if not exists map_url text;
alter table public.requests add column if not exists map_url text;

-- ------------------------------------------------------------
-- 2. What counts as a map link
--
-- This URL is tapped from the owner's phone, so a stranger must not be
-- able to put anything they like behind it. Anything that is not one of
-- the map services below is dropped rather than refused: the address in
-- words is the part that matters, and a rejected request helps nobody.
-- ------------------------------------------------------------
create or replace function public.clean_map_url(p_url text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when v is null                                       then null
    when v ~* '^https://(www\.)?google\.[a-z.]+/maps'    then v
    when v ~* '^https://maps\.google\.[a-z.]+/'          then v
    when v ~* '^https://maps\.app\.goo\.gl/'             then v
    when v ~* '^https://goo\.gl/maps/'                   then v
    when v ~* '^https://maps\.apple\.com/'               then v
    when v ~* '^https://(www\.)?waze\.com/'              then v
    else null
  end
  from (select nullif(left(btrim(coalesce(p_url, '')), 500), '') as v) s;
$$;

-- ------------------------------------------------------------
-- 3. submit_request(), now carrying the link
--
-- The old four-argument version is dropped rather than left beside this
-- one: two signatures differing by one argument make the call ambiguous,
-- and the error PostgREST returns for that says nothing useful.
--
-- p_map_url comes last and defaults to null so that psql callers and any
-- future SQL need not pass it.
--
-- It does NOT keep the previous release's form alive. PostgREST matches an
-- RPC by the exact set of argument names it is sent, and a defaulted
-- parameter does not make a smaller call match: once this file has run, a
-- four-argument call fails with PGRST202 until the new code is deployed.
-- An earlier version of this comment claimed otherwise and was wrong — the
-- demo's request form went down for exactly that reason. Run this file and
-- deploy together, or paste a four-argument wrapper delegating to this one
-- and drop it afterwards.
-- ------------------------------------------------------------
drop function if exists public.submit_request(text, text, text, jsonb);

create or replace function public.submit_request(
  p_name    text,
  p_phone   text,
  p_address text,
  p_items   jsonb,
  p_map_url text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := btrim(coalesce(p_name, ''));
  v_phone    text := nullif(btrim(coalesce(p_phone, '')), '');
  v_digits   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_address  text := nullif(btrim(coalesce(p_address, '')), '');
  v_map      text := public.clean_map_url(p_map_url);
  v_len      int;
  v_recent   int;
  v_req      uuid;
  v_item     jsonb;
  v_budget   text;
  v_photo    text;
  v_pos      int := 0;
begin
  if v_name = '' then
    return json_build_object('ok', false, 'reason', 'name');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return json_build_object('ok', false, 'reason', 'items');
  end if;

  v_len := jsonb_array_length(p_items);
  if v_len < 1 or v_len > 10 then
    return json_build_object('ok', false, 'reason', 'items');
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if btrim(coalesce(v_item->>'description', '')) = '' then
      return json_build_object('ok', false, 'reason', 'items');
    end if;
  end loop;

  -- Nobody sends you five separate requests in an hour from one number.
  if length(v_digits) >= 7 then
    select count(*) into v_recent
      from public.requests
     where created_at > now() - interval '1 hour'
       and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits;

    if v_recent >= 5 then
      return json_build_object('ok', false, 'reason', 'too_many');
    end if;
  end if;

  insert into public.requests (name, phone, address, map_url, status)
  values (v_name, v_phone, v_address, v_map, 'pending')
  returning id into v_req;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;

    v_budget := btrim(coalesce(v_item->>'budget', ''));
    v_photo  := btrim(coalesce(v_item->>'photo', ''));

    insert into public.request_items (request_id, position, description, specs, budget, photo)
    values (
      v_req,
      v_pos,
      left(btrim(v_item->>'description'), 500),
      nullif(left(btrim(coalesce(v_item->>'specs', '')), 300), ''),
      case when v_budget ~ '^\d+(\.\d+)?$' then v_budget::numeric(12,2) else null end,
      -- Anything outside requests/ is not something this form uploaded.
      case when v_photo like 'requests/%' then v_photo else null end
    );
  end loop;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.submit_request(text, text, text, jsonb, text) from public;
grant execute on function public.submit_request(text, text, text, jsonb, text) to anon, authenticated;
