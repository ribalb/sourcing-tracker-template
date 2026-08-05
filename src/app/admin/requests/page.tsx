"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fill, formatDate, moneyOrDash, phoneKey, waNumber } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import type { Client, ClientRequest } from "@/lib/types";
import { Button, Card, Empty, ErrorNote, Loading, WhatsAppIcon } from "@/components/ui";

export default function RequestsPage() {
  const { t, lang } = useI18n();

  const [rows, setRows] = useState<ClientRequest[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Request currently asking "existing client, or new one?" */
  const [matching, setMatching] = useState<{ id: string; candidates: Client[] } | null>(null);

  /** Filled after a successful approval, so we can offer the WhatsApp message. */
  const [notify, setNotify] = useState<{ id: string; href: string } | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();

    const base = sb.from("requests").select("*").order("created_at", { ascending: false });
    const [reqs, cls] = await Promise.all([
      showAll ? base : base.eq("status", "pending"),
      sb.from("clients").select("*"),
    ]);

    if (reqs.error || cls.error) {
      setError(reqs.error?.message ?? cls.error!.message);
      return;
    }
    setRows((reqs.data ?? []) as ClientRequest[]);
    setClients((cls.data ?? []) as Client[]);
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

  /** Existing clients that look like the same person. Suggestion only. */
  function candidatesFor(req: ClientRequest): Client[] {
    const key = phoneKey(req.phone);
    const name = req.name.trim().toLowerCase();

    return clients.filter(
      (c) => (key !== null && phoneKey(c.phone) === key) || c.name.trim().toLowerCase() === name,
    );
  }

  function startApprove(req: ClientRequest) {
    const candidates = candidatesFor(req);
    if (candidates.length > 0) {
      setMatching({ id: req.id, candidates });
      return;
    }
    approve(req, null);
  }

  /** `clientId` null means "create a new client for this request". */
  async function approve(req: ClientRequest, clientId: string | null) {
    setBusyId(req.id);
    setMatching(null);
    setError(null);

    const sb = supabaseBrowser();
    try {
      let id = clientId;

      if (!id) {
        const { data, error } = await sb
          .from("clients")
          .insert({ name: req.name, phone: req.phone })
          .select("id")
          .single();
        if (error) throw error;
        id = (data as { id: string }).id;
      }

      const { error: iErr } = await sb.from("items").insert({
        client_id: id,
        description: req.description,
        specs: req.specs,
        budget: req.budget,
        status: "requested",
        request_photo: req.photo,
      });
      if (iErr) throw iErr;

      const { error: rErr } = await sb
        .from("requests")
        .update({ status: "approved", client_id: id })
        .eq("id", req.id);
      if (rErr) throw rErr;

      await buildNotify(req, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusyId(null);
    }
  }

  /** Compose the "approved and being processed" WhatsApp message. */
  async function buildNotify(req: ClientRequest, clientId: string) {
    const { data } = await supabaseBrowser()
      .from("clients")
      .select("name,phone,token")
      .eq("id", clientId)
      .single();

    const client = data as Pick<Client, "name" | "phone" | "token"> | null;
    const number = waNumber(client?.phone);
    if (!client || !number) return;

    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const text = fill(t("msg.approved"), {
      name: client.name,
      item: req.description,
      link: `${base}/c/${client.token}`,
    });

    setNotify({ id: req.id, href: `https://wa.me/${number}?text=${encodeURIComponent(text)}` });
  }

  async function reject(req: ClientRequest) {
    if (!confirm(t("req.rejectConfirm"))) return;

    setBusyId(req.id);
    const { error } = await supabaseBrowser()
      .from("requests")
      .update({ status: "rejected" })
      .eq("id", req.id);

    setBusyId(null);
    if (error) setError(error.message);
    else await load();
  }

  if (error) return <ErrorNote message={error} />;
  if (!rows) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("req.inbox")}</h1>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-ink"
        >
          {showAll ? t("req.showPending") : t("req.showAll")}
        </button>
      </div>

      {/*
        Sits above the list, not inside the request's card: approving removes
        that card from the pending list, which would take the prompt with it.
      */}
      {notify && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <span className="text-sm text-emerald-900">{t("req.approvedNotify")}</span>
          <div className="flex items-center gap-2">
            <a
              href={notify.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <WhatsAppIcon />
              {t("item.notify")}
            </a>
            <button
              type="button"
              onClick={() => setNotify(null)}
              className="rounded-lg px-2 py-2 text-sm text-emerald-800/70 transition hover:text-emerald-900"
              aria-label={t("common.cancel")}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>{showAll ? t("req.emptyAll") : t("req.empty")}</Empty>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((req) => {
            const url = photoUrl(req.photo);
            const pending = req.status === "pending";
            const asking = matching?.id === req.id;

            return (
              <li key={req.id}>
                <Card className={pending ? "" : "opacity-60"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{req.name}</p>
                      {req.phone && (
                        <p dir="ltr" className="mt-0.5 text-sm text-stone-500 rtl:text-end">
                          {req.phone}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-stone-400">
                        {formatDate(req.created_at, lang)}
                      </p>
                    </div>
                    {!pending && (
                      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                        {req.status === "approved" ? t("req.approved") : t("req.rejected")}
                      </span>
                    )}
                  </div>

                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={req.description}
                        className="mt-3 h-44 w-full rounded-xl border border-cream-200 object-cover"
                      />
                    </a>
                  )}

                  <p className="mt-3 whitespace-pre-line text-sm text-ink">{req.description}</p>
                  {req.specs && <p className="mt-1 text-sm text-stone-600">{req.specs}</p>}
                  <p className="mt-1.5 text-sm">
                    <span className="text-stone-400">{t("item.budget")} </span>
                    <span className="font-semibold tabular-nums text-ink">
                      {moneyOrDash(req.budget)}
                    </span>
                  </p>

                  {/* ------------------------------- possible duplicate ask */}
                  {asking && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-amber-900">{t("req.match")}</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        {t("req.matchHint")}
                      </p>

                      <div className="mt-2.5 space-y-2">
                        {matching!.candidates.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => approve(req, c.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-start transition hover:border-amber-300"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">
                                {c.name}
                              </span>
                              {c.phone && (
                                <span dir="ltr" className="block text-xs text-stone-500">
                                  {c.phone}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs font-medium text-emerald-700">
                              {t("req.attach")} →
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2.5 flex gap-2">
                        <Button variant="secondary" onClick={() => approve(req, null)}>
                          {t("req.createNew")}
                        </Button>
                        <Button variant="ghost" onClick={() => setMatching(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {pending && !asking ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="flex-1"
                        disabled={busyId === req.id}
                        onClick={() => startApprove(req)}
                      >
                        {busyId === req.id ? t("common.saving") : t("req.approve")}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busyId === req.id}
                        onClick={() => reject(req)}
                      >
                        {t("req.reject")}
                      </Button>
                    </div>
                  ) : (
                    !pending &&
                    req.client_id && (
                      <Link
                        href={`/admin/clients/${req.client_id}`}
                        className="mt-3 inline-block text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-ink"
                      >
                        {t("req.openClient")}
                      </Link>
                    )
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
