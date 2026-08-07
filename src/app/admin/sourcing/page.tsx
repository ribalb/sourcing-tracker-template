"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fill, money, moneyOrDash, toNumber } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import {
  BUY_CURRENCIES,
  CURRENCY_SYMBOL,
  toUsd,
  type BuyCurrency,
  type Item,
  type Settings,
  type Status,
} from "@/lib/types";
import {
  Button,
  Empty,
  ErrorNote,
  Input,
  Loading,
  Money,
  Select,
  StatusBadge,
} from "@/components/ui";

/** The statuses that mean "still to find". */
const TO_SOURCE: Status[] = ["requested", "sourcing"];

type Row = Pick<
  Item,
  | "id"
  | "description"
  | "specs"
  | "budget"
  | "status"
  | "request_photo"
  | "found_photo"
  | "cost"
  | "cost_currency"
  | "cost_original"
  | "cost_rate"
> & { clientId: string; client: string };

/** The cost half of an item — what a shop visit actually changes. */
type CostPatch = Pick<Item, "cost" | "cost_currency" | "cost_original" | "cost_rate">;

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
 *
 * Bought asks for the price paid on the spot, because that is the one moment
 * the figure is known — the receipt is in the other hand. It writes the same
 * columns as the item form on the client page, so the cost is there when she
 * gets home instead of being remembered.
 */
export default function SourcingPage() {
  const { t } = useI18n();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Items ticked off this visit, holding the values from *before* the tap. */
  const [done, setDone] = useState<Record<string, Row>>({});
  /** The item whose cost is being typed, if any. */
  const [paying, setPaying] = useState<string | null>(null);

  /** What a euro or riyal cost starts from; each item keeps the rate it saved with. */
  const [rates, setRates] = useState({ eur: 1.08, sar: 0.2667 });

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from("items")
      .select(
        "id,description,specs,budget,status,request_photo,found_photo,cost,cost_currency,cost_original,cost_rate,client_id,clients(name)",
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

    const { data: s } = await sb
      .from("settings")
      .select("rate_eur,rate_sar")
      .eq("id", true)
      .maybeSingle();
    if (s) {
      const row = s as Pick<Settings, "rate_eur" | "rate_sar">;
      setRates({ eur: Number(row.rate_eur), sar: Number(row.rate_sar) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Tick an item off, optionally writing what was paid for it at the same time. */
  async function mark(row: Row, status: Status, cost?: CostPatch) {
    const before = row;
    const next = { ...row, status, ...(cost ?? {}) };

    setPaying(null);
    setRows((rs) => rs?.map((r) => (r.id === row.id ? next : r)) ?? rs);
    setDone((d) => ({ ...d, [row.id]: before }));

    const { error } = await supabaseBrowser()
      .from("items")
      .update({ status, ...(cost ?? {}) })
      .eq("id", row.id);

    if (error) {
      setError(error.message);
      setRows((rs) => rs?.map((r) => (r.id === row.id ? before : r)) ?? rs);
      setDone((d) => {
        const rest = { ...d };
        delete rest[row.id];
        return rest;
      });
    }
  }

  /** Put the item back exactly as it was found, cost included. */
  async function undo(row: Row) {
    const before = done[row.id];
    if (!before) return;

    setRows((rs) => rs?.map((r) => (r.id === row.id ? before : r)) ?? rs);
    setDone((d) => {
      const rest = { ...d };
      delete rest[row.id];
      return rest;
    });

    const { error } = await supabaseBrowser()
      .from("items")
      .update({
        status: before.status,
        cost: before.cost,
        cost_currency: before.cost_currency,
        cost_original: before.cost_original,
        cost_rate: before.cost_rate,
      })
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
            const marked = done[row.id] !== undefined;
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

                    <StatusBadge status={row.status} />
                  </div>

                  {/* What was paid, once it is on the item. Stays on your side. */}
                  {marked && row.cost !== null && (
                    <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <span className="text-amber-700">{t("item.cost")} </span>
                      <span className="font-semibold tabular-nums">{money(row.cost)}</span>
                      {row.cost_currency && (
                        <span className="ms-1.5 text-xs text-amber-700">
                          ({CURRENCY_SYMBOL[row.cost_currency]}
                          {row.cost_original})
                        </span>
                      )}
                    </p>
                  )}

                  {paying === row.id ? (
                    <CostPanel
                      rates={rates}
                      onSave={(cost) => mark(row, "bought", cost)}
                      onCancel={() => setPaying(null)}
                    />
                  ) : (
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
                          <Button className="flex-1" onClick={() => setPaying(row.id)}>
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
                  )}
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

/**
 * The one question worth asking in the shop: what did this cost?
 *
 * Same three columns as the item form — a figure in the currency actually
 * handed over, converted to dollars at a rate copied onto the item — because
 * that is what every total and every profit figure reads. An empty amount is
 * allowed: the item is still bought, the cost just gets filled in later.
 */
function CostPanel({
  rates,
  onSave,
  onCancel,
}: {
  rates: { eur: number; sar: number };
  onSave: (cost: CostPatch) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  const [currency, setCurrency] = useState<BuyCurrency>("USD");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Switching currency loads that currency's rate, unless one is already typed. */
  function changeCurrency(next: BuyCurrency) {
    setCurrency(next);
    setRate(next === "USD" ? "" : String(next === "EUR" ? rates.eur : rates.sar));
  }

  const typed = toNumber(amount);
  const usedRate = currency === "USD" ? 1 : (toNumber(rate) ?? 0);
  const costUsd = typed === null ? null : toUsd(typed, usedRate);

  async function save() {
    // A euro cost with no rate would silently save as nothing.
    if (currency !== "USD" && typed !== null && !(usedRate > 0)) {
      setError(t("item.rateMissing"));
      return;
    }

    const converted = currency !== "USD" && typed !== null;
    setBusy(true);
    await onSave({
      cost: costUsd,
      cost_currency: converted ? currency : null,
      cost_original: converted ? typed : null,
      cost_rate: converted ? usedRate : null,
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-sm font-medium text-amber-900">{t("sourcing.paid")}</p>

      <div className="mt-2 flex gap-2">
        <div className="w-24 shrink-0 sm:w-28">
          <Select
            aria-label={t("item.costCurrency")}
            value={currency}
            onChange={(e) => changeCurrency(e.target.value as BuyCurrency)}
          >
            {BUY_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_SYMBOL[c]} {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 flex-1">
          <Money
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            symbol={CURRENCY_SYMBOL[currency]}
          />
        </div>
      </div>

      {/* Only in the way when something was actually converted. */}
      {currency !== "USD" && (
        <div className="mt-2 flex items-end justify-between gap-3 rounded-lg bg-white/70 px-3 py-2.5">
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-amber-800">
              {fill(t("item.costRate"), { cur: currency })}
            </span>
            <div className="w-24 sm:w-28">
              {/* Not <Money>: it pins step to 0.01, and a rate has four places. */}
              <Input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0"
                dir="ltr"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </label>

          <p className="pb-1.5 text-end">
            <span className="block text-xs font-medium text-amber-800">
              {t("item.costInUsd")}
            </span>
            <span className="text-lg font-semibold tabular-nums text-amber-900">
              {moneyOrDash(costUsd)}
            </span>
          </p>
        </div>
      )}

      <p className="mt-2 text-xs text-amber-800">{t("sourcing.paidHint")}</p>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-700">{error}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button className="flex-1" disabled={busy} onClick={save}>
          {busy ? t("common.saving") : t("sourcing.markBought")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
