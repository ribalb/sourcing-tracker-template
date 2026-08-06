"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LangSwitch, useI18n } from "@/lib/i18n";
import { fill } from "@/lib/format";
import { photoUrl, uploadPhoto } from "@/lib/photos";
import { isMapUrl, pinUrl } from "@/lib/maps";
import { Logo } from "@/components/logo";
import type { DraftItem } from "@/lib/types";
import { Button, Card, ErrorNote, Field, Input, Money, Textarea } from "@/components/ui";

/** One request may carry ten items; submit_request() enforces the same number. */
const MAX_ITEMS = 10;

/**
 * React keys for rows that do not exist in any database yet.
 * A counter, not crypto.randomUUID(), which is missing on plain http.
 */
let nextKey = 0;
function blankItem(): DraftItem {
  nextKey += 1;
  return { key: `item-${nextKey}`, description: "", specs: "", budget: "", photo: null };
}

/**
 * The link for the Instagram bio. Anyone can submit; nothing here creates a
 * client or an order. Submissions land in the owner's inbox for approval.
 */
export default function RequestPage() {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [trap, setTrap] = useState(""); // honeypot, see below

  /**
   * navigator.geolocation, like navigator.clipboard, exists only on https or
   * localhost — so this button does nothing when the app is opened by IP over
   * wifi for testing. The pasted link is the way in when that happens.
   *
   * The three ways this fails need three different sentences. Refused is the
   * only one the customer can do something about, and it is silent: once a
   * phone has been told no, it stops asking, so "didn't share" reads as a
   * broken button rather than a setting to change.
   */
  function locate() {
    if (!navigator.geolocation) {
      setMapError(t("req.mapNoGeo"));
      return;
    }

    setLocating(true);
    setMapError(null);

    const pin = (pos: GeolocationPosition) => {
      setLocating(false);
      setMapUrl(pinUrl(pos.coords.latitude, pos.coords.longitude));
    };

    const fail = (err: GeolocationPositionError) => {
      setLocating(false);
      setMapError(t(err.code === err.PERMISSION_DENIED ? "req.mapDenied" : "req.mapNoFix"));
    };

    /**
     * Indoors, a satellite fix can take longer than anyone is willing to
     * stand still for — and a flat on the third floor is exactly where these
     * requests are written. So a slow or failed precise attempt drops to the
     * coarse one, which wifi answers almost at once. A pin on the right
     * building beats no pin at all; the written address carries the rest.
     */
    navigator.geolocation.getCurrentPosition(
      pin,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          fail(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(pin, fail, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }

  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const patchItem = useCallback((key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }, []);

  function addItem() {
    setItems((prev) => (prev.length >= MAX_ITEMS ? prev : [...prev, blankItem()]));
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const filled = items.filter((it) => it.description.trim() !== "");
    if (!name.trim() || filled.length === 0) return;

    // A bot fills every field it finds; a person never sees this one.
    if (trap) {
      setSent(true);
      return;
    }

    setBusy(true);
    setError(null);

    const { data, error } = await supabaseBrowser().rpc("submit_request", {
      p_name: name.trim(),
      p_phone: phone.trim() || null,
      p_address: address.trim() || null,
      p_map_url: mapUrl,
      p_items: filled.map((it) => ({
        description: it.description.trim(),
        specs: it.specs.trim() || null,
        budget: it.budget.trim() || null,
        photo: it.photo,
      })),
    });

    setBusy(false);

    if (error) {
      setError(t("req.failed"));
      return;
    }

    const result = data as { ok: boolean; reason?: string } | null;
    if (!result?.ok) {
      setError(result?.reason === "too_many" ? t("req.errFlood") : t("req.failed"));
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

          <Field label={t("req.address")} hint={t("req.addressHint")}>
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>

          {/* Not a <Field>: that renders a <label>, and a button inside a label
              steals its own click to focus the input instead. */}
          <div className="min-w-0">
            <p className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-stone-700">
              {t("req.map")}
              <span className="text-xs font-normal text-stone-400">({t("common.optional")})</span>
            </p>

            {mapUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5">
                <span className="min-w-0 text-sm text-ink">✓ {t("req.mapPinned")}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg px-2.5 py-1.5 text-sm text-stone-600 hover:bg-cream-100"
                  >
                    {t("req.mapCheck")}
                  </a>
                  <Button variant="ghost" onClick={() => setMapUrl(null)}>
                    {t("req.mapClear")}
                  </Button>
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="secondary" disabled={locating} onClick={locate}>
                  {locating ? t("req.mapLocating") : t("req.mapUse")}
                </Button>
                <p className="text-xs text-stone-400">{t("req.mapOr")}</p>
                <Input
                  dir="ltr"
                  inputMode="url"
                  placeholder="https://maps.app.goo.gl/…"
                  value={paste}
                  onChange={(e) => {
                    setPaste(e.target.value);
                    setMapError(null);
                    if (isMapUrl(e.target.value)) setMapUrl(e.target.value.trim());
                  }}
                  onBlur={() => {
                    if (paste.trim() && !isMapUrl(paste)) setMapError(t("req.mapBad"));
                  }}
                />
                {mapError && <p className="text-xs text-red-700">{mapError}</p>}
              </div>
            )}

            <p className="mt-1 block text-xs text-stone-400">{t("req.mapHint")}</p>
          </div>

          <hr className="border-cream-200" />

          {/* ------------------------------------------------------- the items */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-stone-700">{t("req.itemsTitle")}</p>

            {items.map((item, index) => (
              <ItemFields
                key={item.key}
                item={item}
                index={index}
                showRemove={items.length > 1}
                onChange={patchItem}
                onRemove={removeItem}
                onError={setError}
                onUploading={setUploading}
              />
            ))}

            {items.length < MAX_ITEMS ? (
              <button
                type="button"
                onClick={addItem}
                className="w-full rounded-xl border border-dashed border-cream-300 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-400 hover:text-ink"
              >
                {t("req.addItem")}
              </button>
            ) : (
              <p className="text-xs text-stone-400">{t("req.maxItems")}</p>
            )}
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

          <Button type="submit" disabled={busy || uploading > 0} className="w-full">
            {busy ? t("req.sending") : t("req.send")}
          </Button>
        </form>
      </Card>
    </main>
  );
}

/* ------------------------------------------------------------------ item */

function ItemFields({
  item,
  index,
  showRemove,
  onChange,
  onRemove,
  onError,
  onUploading,
}: {
  item: DraftItem;
  index: number;
  showRemove: boolean;
  onChange: (key: string, patch: Partial<DraftItem>) => void;
  onRemove: (key: string) => void;
  onError: (message: string | null) => void;
  /** Counts uploads in flight across every item, so submit waits for all of them. */
  onUploading: (update: (n: number) => number) => void;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    onUploading((n) => n + 1);
    onError(null);

    try {
      const path = await uploadPhoto(file, "requests");
      onChange(item.key, { photo: path });
    } catch {
      onError(t("req.photoError"));
    } finally {
      if (mounted.current) setUploading(false);
      onUploading((n) => Math.max(0, n - 1));
    }
  }

  const url = photoUrl(item.photo);

  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50/60 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {fill(t("req.itemN"), { n: String(index + 1) })}
        </span>
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="text-xs font-medium text-red-700 transition hover:underline"
          >
            {t("req.removeItem")}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <Field label={t("req.what")} hint={index === 0 ? t("req.whatHint") : undefined}>
          <Textarea
            required
            rows={2}
            value={item.description}
            onChange={(e) => onChange(item.key, { description: e.target.value })}
          />
        </Field>

        <Field label={t("req.specs")} optional>
          <Input
            value={item.specs}
            onChange={(e) => onChange(item.key, { specs: e.target.value })}
          />
        </Field>

        <Field label={t("req.budget")} optional>
          <Money
            value={item.budget}
            onChange={(e) => onChange(item.key, { budget: e.target.value })}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-stone-700">{t("req.photo")}</p>

          {url ? (
            <div className="overflow-hidden rounded-xl border border-cream-300 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={t("req.photo")} className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(item.key, { photo: null })}
                className="w-full border-t border-cream-200 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                {t("item.photoRemove")}
              </button>
            </div>
          ) : (
            <label className="flex h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-cream-300 bg-white text-sm text-stone-500 transition hover:border-stone-400 hover:text-stone-700">
              {uploading ? t("item.photoUploading") : t("req.photoAdd")}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          )}
          {index === 0 && <p className="mt-1 text-xs text-stone-400">{t("req.photoHint")}</p>}
        </div>
      </div>
    </div>
  );
}
