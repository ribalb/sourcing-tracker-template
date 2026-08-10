"use client";

import { LangSwitch, useI18n } from "@/lib/i18n";
import { fill, formatDate, money } from "@/lib/format";
import { feeOn, isBillable, type PublicItem, type PublicView } from "@/lib/types";
import { photoUrl } from "@/lib/photos";
import { Logo } from "@/components/logo";
import { PaySection } from "@/components/pay-section";
import { Card, Empty, StatusBadge } from "@/components/ui";

export default function ClientView({ view }: { view: PublicView | null }) {
  const { t, lang } = useI18n();

  if (!view) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 text-center">
        <p className="text-lg font-medium text-stone-900">{t("pub.notFound")}</p>
        <p className="mt-1 text-sm text-stone-500">{t("pub.notFoundHint")}</p>
      </main>
    );
  }

  const items = view.items ?? [];

  let total = 0;
  let paid = 0;
  for (const it of items) {
    // Money paid counts even on a canceled item — see totalsOf().
    paid += it.deposit ?? 0;
    if (!isBillable(it.status)) continue;
    total += it.price ?? 0;
  }

  // The percentage the owner set in Settings, charged on the items total.
  // Shown as its own line rather than folded into the prices: what each
  // piece cost stays the number they were quoted.
  const feePct = Number(view.fee_pct ?? 0);
  const fee = feeOn(total, feePct);
  const due = total + fee - paid;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <header className="mb-7">
        <div className="flex items-start justify-between gap-3">
          <Logo size="md" />
          <LangSwitch />
        </div>
        <h1 className="mt-5 text-lg text-stone-600">
          {t("pub.hello")} {view.client.name}
        </h1>
      </header>

      {/* --------------------------------------------------------- totals */}
      <div className="rounded-2xl bg-ink px-5 py-4 text-cream-100 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-cream-100/50">{t("pub.total")}</span>
          <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
        </div>
        {fee > 0 && (
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm text-cream-100/50">
              {fill(t("pub.fee"), { pct: String(feePct) })}
            </span>
            <span className="tabular-nums text-cream-100/90">{money(fee)}</span>
          </div>
        )}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm text-cream-100/50">{t("pub.paid")}</span>
          <span className="tabular-nums text-cream-100/90">{money(paid)}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-cream-100/15 pt-3">
          <span className="text-sm font-medium text-cream-100/70">
            {due < 0 ? t("pub.credit") : t("pub.due")}
          </span>
          <span
            className={`text-2xl font-semibold tabular-nums ${
              due < 0 ? "text-emerald-400" : ""
            }`}
          >
            {money(Math.abs(due))}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------- items */}
      <h2 className="mb-3 mt-7 px-1 text-sm font-semibold text-stone-700">
        {t("pub.title")}
      </h2>

      {items.length === 0 ? (
        <Empty>{t("pub.empty")}</Empty>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <ItemPhoto item={item} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{item.description}</p>
                    {item.specs && (
                      <p className="mt-0.5 text-sm text-stone-500">{item.specs}</p>
                    )}
                    <p className="mt-1 text-xs text-stone-400">
                      {formatDate(item.created_at, lang)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-sm">
                  {item.budget !== null && item.price === null && (
                    <span className="text-stone-500">
                      {t("pub.budget")}{" "}
                      <span className="tabular-nums">{money(item.budget)}</span>
                    </span>
                  )}

                  {item.price === null ? (
                    <span className="text-stone-400">{t("pub.priceTbd")}</span>
                  ) : (
                    <span
                      className={`font-semibold tabular-nums ${
                        isBillable(item.status)
                          ? "text-ink"
                          : "text-stone-400 line-through decoration-stone-400"
                      }`}
                    >
                      {money(item.price)}
                    </span>
                  )}

                  {item.deposit > 0 && (
                    <span className="text-emerald-700">
                      {t("pub.paid")}{" "}
                      <span className="tabular-nums">{money(item.deposit)}</span>
                    </span>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Payment comes last: the client reads what they got, then how to pay. */}
      <PaySection
        payment={view.payment}
        due={due}
        fee={fee}
        feePct={feePct}
        clientName={view.client.name}
      />
    </main>
  );
}

/**
 * Shows the photo of what was found. Before anything is found, falls back to
 * the client's own reference picture, labelled so they know which it is.
 */
function ItemPhoto({ item }: { item: PublicItem }) {
  const { t } = useI18n();

  const found = photoUrl(item.found_photo);
  const reference = photoUrl(item.request_photo);
  const url = found ?? reference;

  if (!url) return null;

  return (
    <div className="mb-3">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={item.description}
          className="h-52 w-full rounded-xl border border-cream-200 object-cover"
        />
      </a>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {found ? t("pub.photoFound") : t("pub.photoRequest")}
      </p>
    </div>
  );
}
