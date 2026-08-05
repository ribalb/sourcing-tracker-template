"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LangSwitch, useI18n } from "@/lib/i18n";
import { Logo } from "@/components/logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const [pending, setPending] = useState(0);

  // Refreshed on every navigation, so approving one updates the badge.
  useEffect(() => {
    supabaseBrowser()
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPending(count ?? 0));
  }, [pathname]);

  const tabs = [
    { href: "/admin", label: t("nav.dashboard") },
    { href: "/admin/sourcing", label: t("nav.sourcing") },
    { href: "/admin/requests", label: t("nav.requests"), badge: pending },
    { href: "/admin/clients", label: t("nav.clients") },
    { href: "/admin/settings", label: t("nav.settings") },
  ];

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-cream-200 bg-cream-100/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/admin" aria-label={t("app.name")}>
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-1.5 text-sm text-stone-500 transition hover:bg-cream-200 hover:text-stone-800"
            >
              {t("nav.logout")}
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pb-2">
          {tabs.map((tab) => {
            const active =
              tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-ink text-cream-100"
                    : "text-stone-600 hover:bg-cream-200 hover:text-stone-900"
                }`}
              >
                {tab.label}
                {!!tab.badge && (
                  <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-5">{children}</main>
    </div>
  );
}
