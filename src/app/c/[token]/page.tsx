import type { Metadata } from "next";
import { supabaseAnon } from "@/lib/supabase/anon";
import type { PublicView } from "@/lib/types";
import ClientView from "./view";

// Always fresh — a status can change while the client has the page open.
export const dynamic = "force-dynamic";

// Private links must never end up in a search engine.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicClientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data, error } = await supabaseAnon().rpc("get_client_by_token", {
    p_token: token,
  });

  const view = error ? null : ((data as PublicView | null) ?? null);

  return <ClientView view={view} />;
}
