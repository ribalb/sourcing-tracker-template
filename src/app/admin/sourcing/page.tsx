"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { moneyOrDash } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import type { Item, Status } from "@/lib/types";
import { Button, Empty, ErrorNote, Loading, StatusBadge } from "@/components/ui";

/** The statuses that mean "still to find". */
const TO_SOURCE: Status[] = ["requested", "sourcing"];

type Row = Pick<
  Item,
  "id" | "description" | "specs" | "budget" | "status" | "request_photo" | "found_photo"
> & { clientId: string; client: string };

function clientNameOf(raw: unknown): string {
  const rel = (raw as { clients?: unknown }).clients;
  if (Array.isArray(rel)) return (rel[0] as { name?: string })?.name ?? "";
  return (rel as { name?: string } | null)?.name ?? "";
}

/**
 * Shopping mode: everything still to find, across every client, on one screen.
 *
 * Built for a phone held in one hand in a shop — photo, size, budget and two
 * big buttons. Items you tick off stay on screen, dimmed, so a mistap can be
 * undone; they are gone next time the page loads.
 */
export default function SourcingPage() {
  const { t } = useI18n();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, Status>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from("items")
      .select(
        "id,description,specs,budget,status,request_photo,found_photo,client_id,clients(name)",
      )
      .in("status", TO_SOURCE)
      .order("created_at", { ascending: true }); // oldest request first

    if (error) {
      setError(error.message);
      return;
    }

    setRows(
      (data ?? []).map((r) => ({
        ...(r as unknown as Row),
        clientId: (r as unknown as { client_id: string }).client_id,
        client: clientNameOf(r),
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mark(row: Row, status: Status) {
    const previous = done[row.id];
    setDone((d) => ({ ...d, [row.id]: status }));

    const { error } = await supabaseBrowser()
      .from("items")
      .update({ status })
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      setDone((d) => {
        const next = { ...d };
        if (previous) next[row.id] = previous;
        else delete next[row.id];
        return next;
      });
    }
  }

  async function undo(row: Row) {
    setDone((d) => {
      const next = { ...d };
      delete next[row.id];
      return next;
    });

    const { error } = await supabaseBrowser()
      .from("items")
      .update({ status: row.status })
      .eq("id", row.id);

    if (error) setError(error.message);
  }

  if (error) return <ErrorNote message={error} />;
  if (!rows) return <Loading />;

  const remaining = rows.filter((r) => !done[r.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t("sourcing.title")}
        </h1>
        <span className="text-sm text-stone-500">
          {remaining} {t("dash.items").toLowerCase()}
        </span>
      </div>

      {rows.length === 0 ? (
        <Empty>{t("sourcing.empty")}</Empty>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const marked = done[row.id];
            const url = photoUrl(row.request_photo ?? row.found_photo);

            return (
              <li key={row.id}>
                <div
                  className={`rounded-2xl border border-cream-200 bg-white p-3.5 shadow-sm transition ${
                    marked ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={row.description}
                          className="h-20 w-20 shrink-0 rounded-xl border border-cream-200 object-cover"
                        />
                      </a>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-cream-300 text-[10px] text-stone-400">
                        {t("sourcing.noPhoto")}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{row.description}</p>
                      {row.specs && (
                        <p className="mt-0.5 text-sm text-stone-600">{row.specs}</p>
                      )}
                      <p className="mt-0.5 truncate text-sm text-stone-500">{row.client}</p>
                      <p className="mt-1 text-sm">
                        <span className="text-stone-400">{t("item.budget")} </span>
                        <span className="font-semibold tabular-nums text-ink">
                          {moneyOrDash(row.budget)}
                        </span>
                      </p>
                    </div>

                    <StatusBadge status={marked ?? row.status} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {marked ? (
                      <button
                        type="button"
                        onClick={() => undo(row)}
                        className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 underline underline-offset-4 transition hover:text-ink"
                      >
                        {t("sourcing.undo")}
                      </button>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => mark(row, "found")}
                        >
                          {t("status.found")}
                        </Button>
                        <Button className="flex-1" onClick={() => mark(row, "bought")}>
                          {t("status.bought")}
                        </Button>
                      </>
                    )}

                    <Link
                      href={`/admin/clients/${row.clientId}`}
                      className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 transition hover:bg-cream-50 hover:text-ink"
                    >
                      {t("sourcing.open")}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <p className="px-1 text-xs leading-relaxed text-stone-400">
          {t("sourcing.hint")}
        </p>
      )}
    </div>
  );
}
