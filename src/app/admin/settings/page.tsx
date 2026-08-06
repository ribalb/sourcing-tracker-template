"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { copyText } from "@/lib/clipboard";
import { toNumber } from "@/lib/format";
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

  /** Dollars per one euro / one riyal. Only ever a starting point — see below. */
  const [rateEur, setRateEur] = useState("1.08");
  const [rateSar, setRateSar] = useState("0.2667");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

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
          setRateEur(String(s.rate_eur ?? "1.08"));
          setRateSar(String(s.rate_sar ?? "0.2667"));
        }
        setLoaded(true);
      });
  }, []);

  /**
   * The only place a password can be set from outside the Supabase dashboard.
   *
   * The current password is asked for even though Supabase does not require
   * it: this app stays signed in on a phone for weeks, and without it anyone
   * who picks up an unlocked handset could lock the owner out of her own
   * business. It is checked by signing in again, which is the only way the
   * browser SDK can prove the person at the keyboard is the account holder.
   */
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwDone(false);

    if (next.length < 8) {
      setPwError(t("settings.pwShort"));
      return;
    }
    if (next !== repeat) {
      setPwError(t("settings.pwMismatch"));
      return;
    }

    setPwBusy(true);
    const sb = supabaseBrowser();

    const { data } = await sb.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setPwBusy(false);
      setPwError(t("settings.pwFailed"));
      return;
    }

    const check = await sb.auth.signInWithPassword({ email, password: current });
    if (check.error) {
      setPwBusy(false);
      setPwError(t("settings.pwWrong"));
      return;
    }

    const { error } = await sb.auth.updateUser({ password: next });
    setPwBusy(false);

    if (error) {
      setPwError(error.message);
      return;
    }

    setCurrent("");
    setNext("");
    setRepeat("");
    setPwDone(true);
    setTimeout(() => setPwDone(false), 5000);
  }

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
        rate_eur: toNumber(rateEur) ?? 1.08,
        rate_sar: toNumber(rateSar) ?? 0.2667,
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

          {/* ------------------------------------------------ buying rates */}
          <div>
            <h2 className="text-sm font-semibold text-stone-700">{t("settings.rates")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {t("settings.ratesHint")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("settings.rateEur")}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0"
                dir="ltr"
                value={rateEur}
                onChange={(e) => setRateEur(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </Field>
            <Field label={t("settings.rateSar")} hint={t("settings.rateSarHint")}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0"
                dir="ltr"
                value={rateSar}
                onChange={(e) => setRateSar(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </Field>
          </div>

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

      {/* ------------------------------------------------------ your password */}
      <Card>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-700">{t("settings.password")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {t("settings.passwordHint")}
            </p>
          </div>

          <Field label={t("settings.pwCurrent")}>
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("settings.pwNew")} hint={t("settings.pwRule")}>
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field label={t("settings.pwRepeat")}>
              <Input
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </Field>
          </div>

          {pwError && <ErrorNote message={pwError} />}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={pwBusy || !current || !next || !repeat}
            >
              {pwBusy ? t("common.saving") : t("settings.pwChange")}
            </Button>
            {pwDone && (
              <span className="text-sm font-medium text-emerald-700">{t("settings.pwDone")}</span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
