"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useI18n, LangSwitch } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { Button, ErrorNote, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  /** Set by the client when a request came back 401 and the session was dropped. */
  const [expired, setExpired] = useState(false);

  // Read from the address rather than useSearchParams: that hook forces this
  // page behind a Suspense boundary at build time for one optional flag.
  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).has("expired"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });

    if (error) {
      // Show Supabase's own wording — "Invalid login credentials" and
      // "Email not confirmed" need completely different fixes.
      setError(error.message);
      setHint(true);
      setBusy(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-12">
      <div className="mb-9 flex flex-col items-center">
        <Logo size="lg" />
        <p className="mt-5 text-sm text-stone-500">{t("login.subtitle")}</p>
        <LangSwitch className="mt-4" />
      </div>

      {expired && !error && (
        <p className="mb-4 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5 text-sm text-stone-600">
          {t("login.expired")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("login.email")}>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={t("login.password")}>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <ErrorNote message={error} />}
        {hint && (
          <p className="px-1 text-xs leading-relaxed text-stone-500">{t("login.hint")}</p>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t("login.working") : t("login.submit")}
        </Button>
      </form>
    </main>
  );
}
