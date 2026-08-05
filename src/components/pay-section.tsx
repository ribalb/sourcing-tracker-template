"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { copyText } from "@/lib/clipboard";
import { money, waNumber } from "@/lib/format";
import type { PaymentInfo } from "@/lib/types";

/**
 * "How to pay", set as editorial type rather than a component box:
 * hairlines instead of borders, a serif heading, numbers left to carry
 * the weight. Deliberately quiet — it should read as part of the page,
 * not as an interface pasted onto it.
 */
export function PaySection({
  payment,
  due,
  clientName,
}: {
  payment: PaymentInfo | null;
  due: number;
  clientName: string;
}) {
  const { t, lang } = useI18n();

  if (!payment || due <= 0) return null;

  const note = (lang === "ar" ? payment.ar : payment.en) || payment.en || payment.ar;
  const account = payment.account?.trim() || null;
  const owner = waNumber(payment.whatsapp);

  if (!note && !account && !owner) return null;

  const paidMessage =
    lang === "ar"
      ? `مرحباً، أنا ${clientName}. لقد أرسلت ${money(due)}${
          payment.method ? ` عبر ${payment.method}` : ""
        }.`
      : `Hello, this is ${clientName}. I have sent ${money(due)}${
          payment.method ? ` through ${payment.method}` : ""
        }.`;

  const accountLabel = payment.method
    ? `${payment.method} ${t("pub.account")}`
    : t("pub.account");

  return (
    <section className="mt-7 border-t border-cream-300 pt-6">
      <h2 className="font-display text-2xl tracking-tight text-ink">{t("pub.howToPay")}</h2>

      {note && (
        <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-stone-600">
          <Rich text={note} />
        </p>
      )}

      <div className="mt-6 border-t border-cream-300">
        {account && (
          <Line
            label={accountLabel}
            value={account}
            sub={
              payment.account_name
                ? `${t("pub.accountName")} ${payment.account_name}`
                : undefined
            }
            mono
            bold
          />
        )}
        {/* Copies the bare number, so it pastes straight into a payment app. */}
        <Line label={t("pub.amountToSend")} value={money(due)} copyValue={String(due)} />
      </div>

      {owner && (
        <a
          href={`https://wa.me/${owner}?text=${encodeURIComponent(paidMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 border-b border-cream-300 pb-6 text-sm font-medium uppercase tracking-[0.15em] text-emerald-800 transition hover:text-emerald-900"
        >
          {t("pub.iPaid")}
          <span className="flip-rtl" aria-hidden="true">
            →
          </span>
        </a>
      )}
    </section>
  );
}

/**
 * Renders **double-asterisk** spans in bold, so the owner can emphasise
 * the account number inside her own wording without any HTML.
 */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i} className="font-bold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Line({
  label,
  value,
  copyValue,
  sub,
  mono = false,
  bold = false,
}: {
  label: string;
  value: string;
  copyValue?: string;
  sub?: string;
  mono?: boolean;
  bold?: boolean;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (await copyText(copyValue ?? value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="border-b border-cream-300 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
        {label}
      </p>

      <div className="mt-1 flex items-baseline justify-between gap-4">
        <span
          dir="ltr"
          className={`min-w-0 truncate text-2xl text-ink rtl:text-right ${
            mono ? "font-mono tracking-tight" : "tabular-nums"
          } ${bold ? "font-bold" : ""}`}
        >
          {value}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 text-xs underline underline-offset-4 transition ${
            copied ? "text-emerald-700 no-underline" : "text-stone-500 hover:text-ink"
          }`}
        >
          {copied ? t("pub.copied") : t("pub.copy")}
        </button>
      </div>

      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}
