import { createClient } from "@supabase/supabase-js";

/**
 * Server-side client with no session, used only by the public client page.
 * It can reach exactly one thing: the get_client_by_token() function,
 * which returns a hand-picked set of safe columns. Row Level Security
 * blocks it from reading the tables directly.
 */
export function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
