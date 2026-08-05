"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { copyText } from "@/lib/clipboard";
import type { Settings } from "@/lib/types";
import { PaySection } from "@/components/pay-section";
import { Button, Card, ErrorNote, Field, Input, Loading, Textarea } from "@/components/ui";

export default function SettingsPage() {
  const { t } = useI18n();

  const [loaded, setLoaded] = useState(false);
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [method, setMethod] = useState("");
  const [account, setAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const requestUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  }/request`;

  async function copyRequestLink() {
    if (await copyText(requestUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  useEffect(() => {
    supabaseBrowser()
      .from("settings")
      .select("*")
      .eq("id", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) {
          const s = data as Settings;
          setEn(s.payment_note_en ?? "");
          setAr(s.payment_note_ar ?? "");
          setMethod(s.pay_method ?? "");
          setAccount(s.pay_account ?? "");
          setAccountName(s.pay_account_name ?? "");
          setWhatsapp(s.owner_whatsapp ?? "");
        }
        setLoaded(true);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabaseBrowser()
      .from("settings")
      .update({
        payment_note_en: en.trim() || null,
        payment_note_ar: ar.trim() || null,
        pay_method: method.trim() || null,
        pay_account: account.trim() || null,
        pay_account_name: accountName.trim() || null,
        owner_whatsapp: whatsapp.trim() || null,
      })
      .eq("id", true);

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!loaded) return <Loading />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("settings.title")}</h1>

      <Card>
        <h2 className="text-sm font-semibold text-stone-700">{t("req.link")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{t("req.linkHint")}</p>

        <p
          dir="ltr"
          className="mt-2.5 select-all truncate rounded-lg bg-cream-50 px-3 py-2 font-mono text-xs text-stone-600"
        >
          {requestUrl}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyRequestLink}>
            {copied ? t("client.copied") : t("client.copy")}
          </Button>
          <a
            href="/request"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-cream-50"
          >
            {t("settings.preview2")}
          </a>
        </div>
      </Card>

      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-700">{t("settings.payment")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {t("settings.paymentHint")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("settings.method")} hint={t("settings.methodHint")}>
              <Input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Whish"
              />
            </Field>
            <Field label={t("settings.account")}>
              <Input
                dir="ltr"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="1548-5854"
              />
            </Field>
          </div>

          <Field label={t("settings.accountName")} optional>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </Field>

          <Field label={t("settings.whatsapp")} hint={t("settings.whatsappHint")} optional>
            <Input
              type="tel"
              dir="ltr"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+961 71 622 967"
            />
          </Field>

          <hr className="border-cream-200" />

          <Field label={t("settings.en")} hint={t("settings.bold")} optional>
            <Textarea
              dir="ltr"
              value={en}
              onChange={(e) => setEn(e.target.value)}
              placeholder={t("settings.placeholderEn")}
            />
          </Field>

          <Field label={t("settings.ar")} optional>
            <Textarea
              dir="rtl"
              value={ar}
              onChange={(e) => setAr(e.target.value)}
              placeholder={t("settings.placeholderAr")}
            />
          </Field>

          {error && <ErrorNote message={error} />}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? t("common.saving") : t("common.save")}
            </Button>
            {saved && (
              <span className="text-sm font-medium text-emerald-700">{t("settings.saved")}</span>
            )}
          </div>
        </form>
      </Card>

      {/* Live preview — the real component, so it cannot drift from reality. */}
      <div>
        <p className="mb-2 px-1 text-xs font-medium text-stone-500">{t("settings.preview")}</p>
        <PaySection
          due={105}
          clientName="Rana"
          payment={{
            en: en.trim() || null,
            ar: ar.trim() || null,
            method: method.trim() || null,
            account: account.trim() || null,
            account_name: accountName.trim() || null,
            whatsapp: whatsapp.trim() || null,
          }}
        />
      </div>
    </div>
  );
}
