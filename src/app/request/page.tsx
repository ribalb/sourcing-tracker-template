"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LangSwitch, useI18n } from "@/lib/i18n";
import { toNumber } from "@/lib/format";
import { photoUrl, uploadPhoto } from "@/lib/photos";
import { Logo } from "@/components/logo";
import { Button, Card, ErrorNote, Field, Input, Money, Textarea } from "@/components/ui";

/**
 * The link for the Instagram bio. Anyone can submit; nothing here creates a
 * client or an order. Submissions land in the owner's inbox for approval.
 */
export default function RequestPage() {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [specs, setSpecs] = useState("");
  const [budget, setBudget] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [trap, setTrap] = useState(""); // honeypot, see below

  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      setPhoto(await uploadPhoto(file, "requests"));
    } catch {
      setError(t("req.photoError"));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    // A bot fills every field it finds; a person never sees this one.
    if (trap) {
      setSent(true);
      return;
    }

    setBusy(true);
    setError(null);

    const { error } = await supabaseBrowser().from("requests").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      description: description.trim(),
      specs: specs.trim() || null,
      budget: toNumber(budget),
      photo,
    });

    setBusy(false);
    if (error) {
      setError(t("req.failed"));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 text-center">
        <Logo size="lg" className="self-center" />
        <h1 className="mt-8 text-xl font-semibold text-ink">{t("req.thanks")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">{t("req.thanksBody")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-8">
      <header className="mb-7 flex flex-col items-center">
        <Logo size="lg" />
        <LangSwitch className="mt-5" />
      </header>

      <h1 className="text-xl font-semibold text-ink">{t("req.title")}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{t("req.intro")}</p>

      <Card className="mt-5">
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("req.name")}>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label={t("req.phone")} hint={t("req.phoneHint")}>
            <Input
              type="tel"
              dir="ltr"
              placeholder="+961"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label={t("req.what")} hint={t("req.whatHint")}>
            <Textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label={t("req.specs")} optional>
            <Input value={specs} onChange={(e) => setSpecs(e.target.value)} />
          </Field>

          <Field label={t("req.budget")} optional>
            <Money value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-stone-700">{t("req.photo")}</p>

            {photo ? (
              <div className="overflow-hidden rounded-xl border border-cream-300 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(photo)!}
                  alt={t("req.photo")}
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="w-full border-t border-cream-200 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  {t("item.photoRemove")}
                </button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-cream-300 bg-white text-sm text-stone-500 transition hover:border-stone-400 hover:text-stone-700">
                {uploading ? t("item.photoUploading") : t("req.photoAdd")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </label>
            )}
            <p className="mt-1 text-xs text-stone-400">{t("req.photoHint")}</p>
          </div>

          {/* Honeypot: hidden from people, irresistible to bots. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          {error && <ErrorNote message={error} />}

          <Button type="submit" disabled={busy || uploading} className="w-full">
            {busy ? t("req.sending") : t("req.send")}
          </Button>
        </form>
      </Card>
    </main>
  );
}
