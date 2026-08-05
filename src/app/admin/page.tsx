"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { BRAND } from "@/lib/brand";
import { formatDate, money } from "@/lib/format";
import { downloadCsv, isoDate, toCsv } from "@/lib/export";
import { STATUSES, totalsOf, type Item, type Status } from "@/lib/types";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Loading,
  Select,
  Stat,
  StatusBadge,
} from "@/components/ui";

type Row = Pick<
  Item,
  "id" | "description" | "specs" | "budget" | "status" | "price" | "cost" | "deposit" | "created_at"
> & { client: string };

/** Supabase returns a to-one relation as an object, but older versions used an array. */
function clientNameOf(raw: unknown): string {
  const rel = (raw as { clients?: unknown }).clients;
  if (Array.isArray(rel)) return (rel[0] as { name?: string })?.name ?? "";
  return (rel as { name?: string } | null)?.name ?? "";
}

export default function DashboardPage() {
  const { t, lang } = useI18n();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");

  useEffect(() => {
    let alive = true;

    supabaseBrowser()
      .from("items")
      .select(
        "id,description,specs,budget,status,price,cost,deposit,created_at,clients(name)",
      )
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setError(error.message);
          return;
        }
        setRows(
          (data ?? []).map((r) => ({ ...(r as unknown as Row), client: clientNameOf(r) })),
        );
      });

    return () => {
      alive = false;
    };
  }, []);

  /** Date range only — the status breakdown must stay complete. */
  const inRange = useMemo(() => {
    if (!rows) return [];
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;

    return rows.filter((r) => {
      const at = new Date(r.created_at).getTime();
      return at >= start && at <= end;
    });
  }, [rows, from, to]);

  /** What the tiles, the table and every export are based on. */
  const filtered = useMemo(
    () => (status === "all" ? inRange : inRange.filter((r) => r.status === status)),
    [inRange, status],
  );

  const totals = useMemo(() => totalsOf(filtered), [filtered]);

  const byStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const r of inRange) counts[r.status] += 1;
    return counts;
  }, [inRange]);

  const rangeLabel = useMemo(() => {
    if (!from && !to) return t("dash.clear");
    const a = from ? formatDate(`${from}T00:00:00`, lang) : "…";
    const b = to ? formatDate(`${to}T00:00:00`, lang) : "…";
    return `${a} — ${b}`;
  }, [from, to, lang, t]);

  const statusLabel =
    status === "all" ? t("dash.allStatuses") : t(`status.${status}` as TKey);

  function exportExcel() {
    const header = [
      t("report.date"),
      t("clients.name"),
      t("item.description"),
      t("item.specs"),
      t("item.status"),
      t("item.budget"),
      t("item.price"),
      t("item.cost"),
      t("item.profit"),
      t("item.deposit"),
      t("client.due"),
    ];

    const body = filtered.map((r) => {
      const price = r.price ?? 0;
      const cost = r.cost ?? 0;
      const billed = r.status === "canceled" ? 0 : price;
      return [
        isoDate(r.created_at),
        r.client,
        r.description,
        r.specs ?? "",
        t(`status.${r.status}` as TKey),
        r.budget,
        r.price,
        r.cost,
        r.price === null || r.cost === null ? null : price - cost,
        r.deposit,
        billed - (r.deposit ?? 0),
      ];
    });

    // Blank line, then the same totals the tiles show, so the file stands alone.
    const footer = [
      [],
      [t("dash.billed"), totals.billed],
      [t("dash.cost"), totals.cost],
      [t("dash.profit"), totals.profit],
      [t("dash.deposits"), totals.deposits],
      [t("dash.balance"), totals.balance],
      [],
      [t("report.range"), rangeLabel],
      [t("item.status"), statusLabel],
    ];

    downloadCsv(
      `noe-report-${isoDate(new Date())}.csv`,
      toCsv([header, ...body, ...footer] as (string | number | null)[][]),
    );
  }

  if (error) return <ErrorNote message={error} />;
  if (!rows) return <Loading />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("dash.title")}</h1>
        <span className="text-sm text-stone-500">
          {filtered.length} {t("dash.items").toLowerCase()}
        </span>
      </div>

      {/* ------------------------------------------------------- filters */}
      <Card className="print:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("dash.from")}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t("dash.to")}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        <div className="mt-3">
          <Field label={t("item.status")}>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status | "all")}
            >
              <option value="all">{t("dash.allStatuses")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}` as TKey)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {(from || to || status !== "all") && (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setStatus("all");
            }}
            className="mt-3 text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-ink"
          >
            {t("dash.clearAll")}
          </button>
        )}
      </Card>

      {/* -------------------------------------------------------- export */}
      <Card className="print:hidden">
        <h2 className="text-sm font-semibold text-stone-700">{t("report.export")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{t("report.exportHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportExcel} disabled={filtered.length === 0}>
            {t("report.excel")}
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={filtered.length === 0}>
            {t("report.pdf")}
          </Button>
        </div>
      </Card>

      {/* --------------------------------------------------------- tiles */}
      <div className="grid grid-cols-2 gap-3 print:hidden">
        <Stat label={t("dash.billed")} value={money(totals.billed)} />
        <Stat label={t("dash.cost")} value={money(totals.cost)} tone="private" />
        <Stat
          label={t("dash.profit")}
          value={money(totals.profit)}
          tone={totals.profit >= 0 ? "good" : "warn"}
        />
        <Stat label={t("dash.deposits")} value={money(totals.deposits)} />
      </div>

      <div className="print:hidden">
        <Stat label={t("dash.balance")} value={money(totals.balance)} tone="warn" />
        <p className="mt-3 px-1 text-xs text-stone-400">{t("dash.private")}</p>
      </div>

      {/* ----------------------------------------------------- by status */}
      <Card className="print:hidden">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">{t("dash.byStatus")}</h2>
        <ul className="divide-y divide-cream-200">
          {STATUSES.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => setStatus(status === s ? "all" : s)}
                className={`flex w-full items-center justify-between rounded-lg px-1 py-2.5 transition hover:bg-cream-50 ${
                  status === s ? "bg-cream-50" : ""
                }`}
              >
                <StatusBadge status={s} />
                <span className="text-sm font-semibold tabular-nums text-stone-700">
                  {byStatus[s]}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-xs text-stone-400">{t("dash.tapStatus")}</p>
      </Card>

      <PrintableReport
        rows={filtered}
        rangeLabel={rangeLabel}
        statusLabel={statusLabel}
        totals={totals}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Hidden on screen, laid out for paper. "Save as PDF" in the print dialog.  */
/* ------------------------------------------------------------------------ */

function PrintableReport({
  rows,
  rangeLabel,
  statusLabel,
  totals,
}: {
  rows: Row[];
  rangeLabel: string;
  statusLabel: string;
  totals: ReturnType<typeof totalsOf>;
}) {
  const { t, lang } = useI18n();

  return (
    <div className="hidden print:block">
      <header className="mb-5 border-b border-stone-300 pb-3">
        <p className="font-display text-2xl tracking-[0.03em]">
          {BRAND.wordmarkTop} {BRAND.wordmarkBottom}
        </p>
        <h1 className="mt-1 text-base font-semibold">{t("report.title")}</h1>
        <p className="mt-1 text-xs text-stone-600">
          {t("report.range")}: {rangeLabel} · {t("item.status")}: {statusLabel} ·{" "}
          {t("report.generated")}: {formatDate(new Date().toISOString(), lang)}
        </p>
      </header>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-stone-400 text-start">
            <Th>{t("report.date")}</Th>
            <Th>{t("clients.name")}</Th>
            <Th>{t("item.description")}</Th>
            <Th>{t("item.status")}</Th>
            <Th right>{t("item.price")}</Th>
            <Th right>{t("item.cost")}</Th>
            <Th right>{t("item.profit")}</Th>
            <Th right>{t("item.deposit")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-stone-200">
              <Td>{formatDate(r.created_at, lang)}</Td>
              <Td>{r.client}</Td>
              <Td>
                {r.description}
                {r.specs && <span className="text-stone-500"> · {r.specs}</span>}
              </Td>
              <Td>{t(`status.${r.status}` as TKey)}</Td>
              <Td right>{r.price === null ? "—" : money(r.price)}</Td>
              <Td right>{r.cost === null ? "—" : money(r.cost)}</Td>
              <Td right>
                {r.price === null || r.cost === null ? "—" : money(r.price - r.cost)}
              </Td>
              <Td right>{money(r.deposit)}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 border-t border-stone-400 pt-3 text-xs">
        <Total label={t("dash.billed")} value={money(totals.billed)} />
        <Total label={t("dash.cost")} value={money(totals.cost)} />
        <Total label={t("dash.profit")} value={money(totals.profit)} strong />
        <Total label={t("dash.deposits")} value={money(totals.deposits)} />
        <Total label={t("dash.balance")} value={money(totals.balance)} />
      </div>

      <p className="mt-6 text-[10px] text-stone-500">{t("report.confidential")}</p>
    </div>
  );
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-1.5 font-semibold ${right ? "text-end" : "text-start"}`}>{children}</th>
  );
}

function Td({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`py-1.5 align-top ${right ? "text-end tabular-nums" : "text-start"}`}>
      {children}
    </td>
  );
}

function Total({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
