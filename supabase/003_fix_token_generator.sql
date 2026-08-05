-- ============================================================
--  Fix: "function gen_random_bytes(integer) does not exist"
--
--  gen_random_bytes() lives in the pgcrypto extension, which Supabase
--  installs into the `extensions` schema. Functions that pin their
--  search_path to `public` cannot see it, so Reset link failed.
--
--  gen_random_uuid() is built into Postgres itself (pg_catalog), so it
--  is always visible and needs no extension. 20 hex characters is ~80
--  bits of randomness — far beyond guessable.
--
--  Run this once in Supabase -> SQL Editor. Safe to run again.
--  Existing client links are NOT changed.
-- ============================================================

create or replace function public.gen_client_token()
returns text
language sql
volatile
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
$$;

create or replace function public.reset_client_token(p_client_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  new_token text;
begin
  update public.clients
     set token = public.gen_client_token()
   where id = p_client_id
  returning token into new_token;

  return new_token;
end;
$$;

grant execute on function public.gen_client_token() to authenticated;
grant execute on function public.reset_client_token(uuid) to authenticated;
