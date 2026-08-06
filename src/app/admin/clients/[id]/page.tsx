"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { fill, formatDate, money, moneyOrDash, toNumber, waNumber } from "@/lib/format";
import { copyText } from "@/lib/clipboard";
import { photoUrl } from "@/lib/photos";
import { PhotoField } from "@/components/photo-field";
import {
  BUY_CURRENCIES,
  CURRENCY_SYMBOL,
  isClosed,
  totalsOf,
  toUsd,
  type BuyCurrency,
  type Client,
  type Item,
  type Settings,
  type Status,
} from "@/lib/types";
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Money,
  Select,
  Stat,
  StatusBadge,
  StatusSelect,
  Textarea,
  WhatsAppIcon,
} from "@/components/ui";

export default function ClientPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [justChanged, setJustChanged] = useState<string | null>(null);

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [busyAddress, setBusyAddress] = useState(false);

  /**
   * What the item form starts a euro or riyal cost from. Loaded here so a
   * form that opens has them already; each item keeps whatever rate it was
   * saved with, so editing these later never rewrites an old figure.
   */
  const [rates, setRates] = useState({ eur: 1.08, sar: 0.2667 });

  const [others, setOthers] = useState<Client[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [busyMerge, setBusyMerge] = useState(false);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [c, i] = await Promise.all([
      sb.from("clients").select("*").eq("id", clientId).maybeSingle(),
      sb
        .from("items")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ]);

    if (c.error || i.error) {
      setError(c.error?.message ?? i.error!.message);
    } else {
      setClient(c.data as Client | null);
      setItems((i.data ?? []) as Item[]);
    }

    // Everyone else, for the merge picker.
    const { data: rest } = await sb
      .from("clients")
      .select("*")
      .neq("id", clientId)
      .order("name");
    setOthers((rest ?? []) as Client[]);

    const { data: s } = await sb
      .from("settings")
      .select("rate_eur,rate_sar")
      .eq("id", true)
      .maybeSingle();
    if (s) {
      const row = s as Pick<Settings, "rate_eur" | "rate_sar">;
      setRates({ eur: Number(row.rate_eur), sar: Number(row.rate_sar) });
    }

    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => totalsOf(items), [items]);

  /** Closed orders move out of the working list and into History. */
  const open = useMemo(() => items.filter((i) => !isClosed(i.status)), [items]);
  const closed = useMemo(() => items.filter((i) => isClosed(i.status)), [items]);
  const historyTotal = useMemo(
    () => closed.reduce((sum, i) => sum + (i.price ?? 0), 0),
    [closed],
  );

  const shareUrl = useMemo(() => {
    if (!client) return "";
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/c/${client.token}`;
  }, [client]);

  async function copyLink() {
    const ok = await copyText(shareUrl);
    if (!ok) {
      setError(t("client.copyFailed"));
      return;
    }
    setError(null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function whatsappHref(): string | null {
    if (!client) return null;
    const number = waNumber(client.phone);
    if (!number) return null;

    const message =
      lang === "ar"
        ? `مرحباً ${client.name} 👋 يمكنك متابعة طلبك من هنا: ${shareUrl}`
        : `Hello ${client.name} 👋 you can follow your order here: ${shareUrl}`;

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  async function saveAddress() {
    if (!client) return;

    setBusyAddress(true);
    const value = addressDraft.trim() || null;

    const { error } = await supabaseBrowser()
      .from("clients")
      .update({ address: value })
      .eq("id", client.id);

    setBusyAddress(false);
    if (error) {
      setError(error.message);
      return;
    }

    setClient({ ...client, address: value });
    setEditingAddress(false);
  }

  async function resetToken() {
    if (!client || !confirm(t("client.resetConfirm"))) return;

    const { error } = await supabaseBrowser().rpc("reset_client_token", {
      p_client_id: client.id,
    });

    if (error) setError(error.message);
    else await load();
  }

  /**
   * Fold this client into another: every order and request moves across, then
   * this record is removed. Used to clean up a duplicate created before the
   * approval flow started asking.
   */
  async function mergeInto() {
    const target = others.find((c) => c.id === mergeTarget);
    if (!target || !client) return;

    const message = fill(t("client.mergeConfirm"), {
      n: String(items.length),
      name: target.name,
    });
    if (!confirm(message)) return;

    setBusyMerge(true);
    const sb = supabaseBrowser();

    try {
      const moved = await sb.from("items").update({ client_id: target.id }).eq("client_id", client.id);
      if (moved.error) throw moved.error;

      // Requests point at a client too; keep that history pointing somewhere real.
      await sb.from("requests").update({ client_id: target.id }).eq("client_id", client.id);

      const gone = await sb.from("clients").delete().eq("id", client.id);
      if (gone.error) throw gone.error;

      router.replace(`/admin/clients/${target.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
      setBusyMerge(false);
    }
  }

  async function deleteClient() {
    if (!client || !confirm(t("client.deleteConfirm"))) return;

    const { error } = await supabaseBrowser().from("clients").delete().eq("id", client.id);

    if (error) setError(error.message);
    else router.replace("/admin/clients");
  }

  async function setStatus(item: Item, status: Status) {
    // Closing hides the item from the client, so never let it hide a debt
    // without saying so out loud.
    if (status === "closed") {
      const remaining = (item.price ?? 0) - (item.deposit ?? 0);
      if (remaining > 0 && !confirm(`${t("item.closeWithBalance")} (${money(remaining)})`)) {
        return;
      }
    }

    // Optimistic — the badge flips instantly while you're on the phone.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));

    const { error } = await supabaseBrowser().from("items").update({ status }).eq("id", item.id);

    if (error) {
      setError(error.message);
      await load();
      return;
    }

    // Offer to tell the client, rather than sending anything by itself.
    setJustChanged(item.id);
  }

  /** WhatsApp link with a message written for this item's current status. */
  function notifyHref(item: Item): string | null {
    const number = waNumber(client?.phone);
    if (!number || !client) return null;

    const text = fill(t(`msg.${item.status}` as TKey), {
      name: client.name,
      item: item.description,
      link: shareUrl,
    });

    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  async function deleteItem(item: Item) {
    if (!confirm(t("item.deleteConfirm"))) return;

    const { error } = await supabaseBrowser().from("items").delete().eq("id", item.id);

    if (error) setError(error.message);
    else await load();
  }

  if (loading) return <Loading />;
  if (!client) return <Empty>{t("client.notFound")}</Empty>;

  const waHref = whatsappHref();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-stone-900"
      >
        <span className="flip-rtl">←</span> {t("client.back")}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{client.name}</h1>
        {client.phone && (
          <p dir="ltr" className="mt-1 text-sm text-stone-500 rtl:text-right">
            {client.phone}
          </p>
        )}
      </div>

      {error && <ErrorNote message={error} />}

      {/* ---------------------------------------------------- money summary */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("client.billed")} value={money(totals.billed)} />
        <Stat label={t("pub.paid")} value={money(totals.deposits)} />
        <Stat
          label={totals.balance < 0 ? t("client.credit") : t("client.due")}
          value={money(Math.abs(totals.balance))}
          tone={totals.balance > 0 ? "warn" : "good"}
        />
        <Stat label={t("item.profit")} value={money(totals.profit)} tone="private" />
      </div>

      {/* ------------------------------------------------------ share link */}
      <Card>
        <h2 className="text-sm font-semibold text-stone-700">{t("client.link")}</h2>
        <p
          dir="ltr"
          className="mt-2 select-all truncate rounded-lg bg-cream-50 px-3 py-2 font-mono text-xs text-stone-600"
        >
          {shareUrl}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyLink}>
            {copied ? t("client.copied") : t("client.copy")}
          </Button>

          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              {t("client.whatsapp")}
            </a>
          ) : (
            <span className="self-center text-xs text-stone-400">{t("client.noPhone")}</span>
          )}

          <Button variant="ghost" onClick={resetToken}>
            {t("client.reset")}
          </Button>
        </div>
      </Card>

      {/* --------------------------------------------------- delivery address */}
      <Card>
        <h2 className="text-sm font-semibold text-stone-700">{t("client.address")}</h2>
        <p className="mt-1 text-xs text-stone-500">{t("client.addressHint")}</p>

        {editingAddress ? (
          <div className="mt-3 space-y-2.5">
            <Textarea
              autoFocus
              rows={3}
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button disabled={busyAddress} onClick={saveAddress}>
                {busyAddress ? t("common.saving") : t("common.save")}
              </Button>
              <Button variant="ghost" onClick={() => setEditingAddress(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex items-start justify-between gap-3">
            <p
              className={`min-w-0 whitespace-pre-line text-sm ${
                client.address ? "text-ink" : "text-stone-400"
              }`}
            >
              {client.address || t("client.addressEmpty")}
            </p>
            <Button
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setAddressDraft(client.address ?? "");
                setEditingAddress(true);
              }}
            >
              {t("common.edit")}
            </Button>
          </div>
        )}
      </Card>

      {/* ----------------------------------------------------------- items */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-stone-900">
          {t("dash.items")}
        </h2>
        <Button
          onClick={() => {
            setAddingItem((v) => !v);
            setEditingId(null);
          }}
          variant={addingItem ? "secondary" : "primary"}
        >
          {addingItem ? t("common.cancel") : t("item.add")}
        </Button>
      </div>

      {addingItem && (
        <ItemForm
          clientId={clientId}
          rates={rates}
          onDone={async () => {
            setAddingItem(false);
            await load();
          }}
          onCancel={() => setAddingItem(false)}
        />
      )}

      {open.length === 0 && !addingItem ? (
        <Empty>{closed.length > 0 ? t("item.allClosed") : t("item.empty")}</Empty>
      ) : (
        <ul className="space-y-2.5">{open.map(renderItem)}</ul>
      )}

      {/* ------------------------------------------------------- history */}
      {closed.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white px-4 py-3.5 text-start shadow-sm transition hover:border-cream-300"
          >
            <span>
              <span className="font-medium text-ink">{t("item.history")}</span>
              <span className="ms-2 text-sm text-stone-500">{closed.length}</span>
            </span>
            <span className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tabular-nums text-stone-600">
                {money(historyTotal)}
              </span>
              <span
                className={`text-stone-400 transition-transform ${
                  showHistory ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </span>
          </button>

          {showHistory && (
            <>
              <p className="mt-2 px-1 text-xs text-stone-400">{t("item.historyHint")}</p>
              <ul className="mt-2.5 space-y-2.5">{closed.map(renderItem)}</ul>
            </>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- merge */}
      <div className="pt-4">
        {merging ? (
          <Card className="border-amber-200 bg-amber-50">
            <h3 className="text-sm font-semibold text-amber-900">{t("client.merge")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              {t("client.mergeHint")}
            </p>

            <div className="mt-3">
              <Field label={t("client.mergePick")}>
                <Select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                  <option value="">—</option>
                  {others.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-3 flex gap-2">
              <Button disabled={!mergeTarget || busyMerge} onClick={mergeInto}>
                {busyMerge ? t("common.saving") : t("client.mergeDo")}
              </Button>
              <Button variant="secondary" onClick={() => setMerging(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {others.length > 0 && (
              <Button variant="secondary" onClick={() => setMerging(true)}>
                {t("client.merge")}
              </Button>
            )}
            <Button variant="danger" onClick={deleteClient}>
              {t("client.delete")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  function renderItem(item: Item) {
    return editingId === item.id ? (
              <li key={item.id}>
                <ItemForm
                  clientId={clientId}
                  item={item}
                  rates={rates}
                  onDone={async () => {
                    setEditingId(null);
                    await load();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={item.id}>
                {/* Closed items stay visible to you, but step back visually. */}
                <Card className={isClosed(item.status) ? "opacity-60" : ""}>
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

                  {(item.request_photo || item.found_photo) && (
                    <div className="mt-3 flex gap-2">
                      <Thumb path={item.request_photo} label={t("item.photoRequest")} />
                      <Thumb path={item.found_photo} label={t("item.photoFound")} />
                    </div>
                  )}

                  <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
                    <Row label={t("item.budget")} value={moneyOrDash(item.budget)} />
                    <Row label={t("item.price")} value={moneyOrDash(item.price)} />
                    <Row label={t("item.deposit")} value={money(item.deposit)} />
                  </dl>

                  {/* Everything below this line stays on your side only. */}
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      {t("item.hidden")}
                    </p>
                    <dl className="grid grid-cols-2 gap-x-4 text-sm">
                      <Row label={t("item.cost")} value={moneyOrDash(item.cost)} tone="amber" />
                      <Row
                        label={t("item.profit")}
                        value={profitOf(item.price, item.cost)}
                        tone="amber"
                        strong
                      />
                    </dl>

                    {/* Say what was handed over, so $75.60 stays recognisable. */}
                    {item.cost_currency && (
                      <p className="mt-1 text-xs text-amber-800">
                        {fill(t("item.costPaid"), {
                          amount: `${CURRENCY_SYMBOL[item.cost_currency]}${item.cost_original}`,
                          rate: String(item.cost_rate),
                        })}
                      </p>
                    )}

                    {item.note && (
                      <p className="mt-2 border-t border-amber-200 pt-2 text-xs text-amber-900">
                        {item.note}
                      </p>
                    )}
                  </div>

                  {/* Prompt to message the client, right after a status change */}
                  {justChanged === item.id && notifyHref(item) && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <span className="text-sm text-emerald-900">
                        {t("item.statusChanged")}
                      </span>
                      <a
                        href={notifyHref(item)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setJustChanged(null)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      >
                        <WhatsAppIcon />
                        {t("item.notify")}
                      </a>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="min-w-40 flex-1">
                      <StatusSelect
                        value={item.status}
                        onChange={(s) => setStatus(item, s)}
                      />
                    </div>

                    {notifyHref(item) && justChanged !== item.id && (
                      <a
                        href={notifyHref(item)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("item.notifyHint")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                      >
                        <WhatsAppIcon />
                        {t("item.notify")}
                      </a>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(item.id);
                        setAddingItem(false);
                      }}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button variant="danger" onClick={() => deleteItem(item)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </Card>
              </li>
    );
  }
}

/** Small square preview; tapping opens the full picture in a new tab. */
function Thumb({ path, label }: { path: string | null; label: string }) {
  const url = photoUrl(path);
  if (!url) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        className="h-20 w-20 rounded-lg border border-cream-200 object-cover"
      />
    </a>
  );
}

/** Profit only means something once you know both numbers. */
function profitOf(price: number | null, cost: number | null): string {
  if (price === null || cost === null) return "—";
  return money(price - cost);
}

function Row({
  label,
  value,
  tone = "plain",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "plain" | "amber";
  strong?: boolean;
}) {
  const amber = tone === "amber";
  return (
    <div>
      <dt className={`text-xs ${amber ? "text-amber-700" : "text-stone-500"}`}>{label}</dt>
      <dd
        className={`tabular-nums ${
          amber ? "text-amber-900" : "text-stone-900"
        } ${strong ? "font-semibold" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ form */

function ItemForm({
  clientId,
  item,
  rates,
  onDone,
  onCancel,
}: {
  clientId: string;
  item?: Item;
  rates: { eur: number; sar: number };
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  const [description, setDescription] = useState(item?.description ?? "");
  const [specs, setSpecs] = useState(item?.specs ?? "");
  const [budget, setBudget] = useState(item?.budget?.toString() ?? "");
  const [status, setStatus] = useState<Status>(item?.status ?? "requested");

  /*
   * Cost is typed in whatever was actually paid and stored in dollars.
   * `cost` here is the typed figure, not the saved one — for a euro item
   * it holds 70 while the database holds 75.60.
   */
  const [currency, setCurrency] = useState<BuyCurrency>(item?.cost_currency ?? "USD");
  const [cost, setCost] = useState(
    (item?.cost_currency ? item?.cost_original : item?.cost)?.toString() ?? "",
  );
  const [rate, setRate] = useState(item?.cost_rate?.toString() ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [deposit, setDeposit] = useState(item?.deposit?.toString() ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [requestPhoto, setRequestPhoto] = useState<string | null>(item?.request_photo ?? null);
  const [foundPhoto, setFoundPhoto] = useState<string | null>(item?.found_photo ?? null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Switching currency loads that currency's rate, unless one is already typed. */
  function changeCurrency(next: BuyCurrency) {
    setCurrency(next);
    if (next === "USD") {
      setRate("");
      return;
    }
    setRate(String(next === "EUR" ? rates.eur : rates.sar));
  }

  const typed = toNumber(cost);
  const usedRate = currency === "USD" ? 1 : (toNumber(rate) ?? 0);

  /** What actually gets stored, and what profit is worked out from. */
  const costUsd = typed === null ? null : toUsd(typed, usedRate);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    // A euro cost with no rate would silently save as nothing.
    if (currency !== "USD" && typed !== null && !(usedRate > 0)) {
      setError(t("item.rateMissing"));
      return;
    }

    setBusy(true);
    setError(null);

    const converted = currency !== "USD" && typed !== null;

    const payload = {
      client_id: clientId,
      description: description.trim(),
      specs: specs.trim() || null,
      budget: toNumber(budget),
      status,
      cost: costUsd,
      cost_currency: converted ? currency : null,
      cost_original: converted ? typed : null,
      cost_rate: converted ? usedRate : null,
      price: toNumber(price),
      deposit: toNumber(deposit) ?? 0,
      note: note.trim() || null,
      request_photo: requestPhoto,
      found_photo: foundPhoto,
    };

    const sb = supabaseBrowser();
    const { error } = item
      ? await sb.from("items").update(payload).eq("id", item.id)
      : await sb.from("items").insert(payload);

    setBusy(false);
    if (error) setError(error.message);
    else await onDone();
  }

  return (
    <Card className="border-stone-300">
      <form onSubmit={submit} className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">
          {item ? t("item.edit") : t("item.new")}
        </h3>

        <Field label={t("item.description")} hint={t("item.descriptionHint")}>
          <Input
            autoFocus
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label={t("item.specs")} optional>
          <Input value={specs} onChange={(e) => setSpecs(e.target.value)} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <PhotoField
            label={t("item.photoRequest")}
            hint={t("item.photoRequestHint")}
            value={requestPhoto}
            onChange={setRequestPhoto}
          />
          <PhotoField
            label={t("item.photoFound")}
            hint={t("item.photoFoundHint")}
            value={foundPhoto}
            onChange={setFoundPhoto}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("item.budget")} optional>
            <Money value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label={t("item.status")} hint={t("item.statusHint")}>
            <StatusSelect value={status} onChange={setStatus} />
          </Field>
          <Field label={t("item.price")} optional>
            <Money value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label={t("item.deposit")} optional>
            <Money value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="mb-2.5 text-xs font-semibold text-amber-900">
            {t("common.private")} — {t("dash.private")}
          </p>
          <div className="space-y-3">
            <Field label={t("item.cost")} optional hint={t("item.costHint")}>
              <div className="flex gap-2">
                <Select
                  aria-label={t("item.costCurrency")}
                  className="w-28 shrink-0"
                  value={currency}
                  onChange={(e) => changeCurrency(e.target.value as BuyCurrency)}
                >
                  {BUY_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_SYMBOL[c]} {c}
                    </option>
                  ))}
                </Select>
                <div className="min-w-0 flex-1">
                  <Money
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    symbol={CURRENCY_SYMBOL[currency]}
                  />
                </div>
              </div>
            </Field>

            {/* Only in the way when something was actually converted. */}
            {currency !== "USD" && (
              <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white/70 px-3 py-2.5">
                <label className="min-w-0">
                  <span className="mb-1 block text-xs font-medium text-amber-800">
                    {fill(t("item.costRate"), { cur: currency })}
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    min="0"
                    dir="ltr"
                    className="w-28"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </label>
                <p className="pb-2.5 text-sm text-amber-900">
                  <span className="text-amber-700">= </span>
                  <span className="font-semibold tabular-nums">{moneyOrDash(costUsd)}</span>
                </p>
              </div>
            )}

            {/* Updates as you type, so you can price against a target margin. */}
            <div className="flex items-baseline justify-between rounded-lg bg-white/70 px-3 py-2">
              <span className="text-xs font-medium text-amber-800">{t("item.profit")}</span>
              <span className="text-lg font-semibold tabular-nums text-amber-900">
                {profitOf(toNumber(price), costUsd)}
              </span>
            </div>
            <Field label={t("item.note")} optional>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </div>

        {error && <ErrorNote message={error} />}

        <div className="flex gap-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? t("common.saving") : t("common.save")}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
