"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { money, moneyOrDash } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { totalsOf, type Client, type Item } from "@/lib/types";
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  StatusBadge,
  Textarea,
} from "@/components/ui";

type ItemRow = Pick<
  Item,
  | "id"
  | "client_id"
  | "description"
  | "specs"
  | "status"
  | "price"
  | "cost"
  | "deposit"
  | "request_photo"
  | "found_photo"
>;

export default function ClientsPage() {
  const { t } = useI18n();

  const [clients, setClients] = useState<Client[] | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const sb = supabaseBrowser();
    const [c, i] = await Promise.all([
      sb.from("clients").select("*").order("created_at", { ascending: false }),
      sb
        .from("items")
        .select(
          "id,client_id,description,specs,status,price,cost,deposit,request_photo,found_photo",
        )
        .order("created_at", { ascending: false }),
    ]);

    if (c.error || i.error) {
      setError(c.error?.message ?? i.error!.message);
      return;
    }
    setClients((c.data ?? []) as Client[]);
    setItems((i.data ?? []) as ItemRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  const byClient = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const it of items) {
      const list = map.get(it.client_id);
      if (list) list.push(it);
      else map.set(it.client_id, [it]);
    }
    return map;
  }, [items]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients ?? []) map.set(c.id, c.name);
    return map;
  }, [clients]);

  const query = search.trim().toLowerCase();

  const visibleClients = useMemo(() => {
    if (!clients) return [];
    if (!query) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) || (c.phone ?? "").toLowerCase().includes(query),
    );
  }, [clients, query]);

  /** The same box searches what people ordered, not only who they are. */
  const matchingItems = useMemo(() => {
    if (!query) return [];
    return items.filter(
      (i) =>
        i.description.toLowerCase().includes(query) ||
        (i.specs ?? "").toLowerCase().includes(query),
    );
  }, [items, query]);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    const { error } = await supabaseBrowser().from("clients").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
    });

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }

    setName("");
    setPhone("");
    setAddress("");
    setAdding(false);
    await load();
  }

  if (error) return <ErrorNote message={error} />;
  if (!clients) return <Loading />;

  const nothingFound = query && visibleClients.length === 0 && matchingItems.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("clients.title")}</h1>
        <Button onClick={() => setAdding((v) => !v)} variant={adding ? "secondary" : "primary"}>
          {adding ? t("common.cancel") : t("clients.add")}
        </Button>
      </div>

      {adding && (
        <Card>
          <form onSubmit={addClient} className="space-y-3">
            <Field label={t("clients.name")}>
              <Input autoFocus required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("clients.phone")} optional hint="+961 3 XXX XXX">
              <Input
                type="tel"
                dir="ltr"
                placeholder="+961"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label={t("clients.address")} optional hint={t("clients.addressHint")}>
              <Textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </Card>
      )}

      {clients.length > 0 && (
        <div>
          <Input
            type="search"
            placeholder={t("clients.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="mt-1 px-1 text-xs text-stone-400">{t("clients.searchHint")}</p>
        </div>
      )}

      {clients.length === 0 ? (
        <Empty>{t("clients.empty")}</Empty>
      ) : nothingFound ? (
        <Empty>{t("clients.noMatch")}</Empty>
      ) : (
        <>
          {visibleClients.length > 0 && (
            <ul className="space-y-2.5">
              {visibleClients.map((c) => {
                const totals = totalsOf(byClient.get(c.id) ?? []);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="block rounded-2xl border border-cream-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-cream-300 hover:shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{c.name}</p>
                          <p className="mt-0.5 text-sm text-stone-500">
                            {totals.count} {t("client.items")}
                            {c.phone && <span dir="ltr"> · {c.phone}</span>}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-sm font-semibold tabular-nums text-ink">
                            {money(totals.billed)}
                          </p>
                          {totals.balance > 0 && (
                            <p className="mt-0.5 text-xs tabular-nums text-amber-700">
                              {t("client.due")} {money(totals.balance)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ------------------------------------------- matching items */}
          {matchingItems.length > 0 && (
            <div className="pt-2">
              <h2 className="mb-2.5 px-1 text-sm font-semibold text-stone-700">
                {t("clients.matchingItems")}{" "}
                <span className="font-normal text-stone-400">{matchingItems.length}</span>
              </h2>

              <ul className="space-y-2.5">
                {matchingItems.map((item) => {
                  const url = photoUrl(item.found_photo ?? item.request_photo);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/admin/clients/${item.client_id}`}
                        className="flex gap-3 rounded-2xl border border-cream-200 bg-white p-3 shadow-sm transition hover:border-cream-300 hover:shadow"
                      >
                        {url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={url}
                            alt={item.description}
                            className="h-16 w-16 shrink-0 rounded-lg border border-cream-200 object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-lg border border-dashed border-cream-300" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink">{item.description}</p>
                          {item.specs && (
                            <p className="truncate text-sm text-stone-600">{item.specs}</p>
                          )}
                          <p className="truncate text-sm text-stone-500">
                            {nameOf.get(item.client_id)}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <StatusBadge status={item.status} />
                          <span className="text-sm font-semibold tabular-nums text-ink">
                            {moneyOrDash(item.price)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
