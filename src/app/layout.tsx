import type { Metadata, Viewport } from "next";
import { LangProvider } from "@/lib/i18n";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.name} — Tracker`,
  description: `Sourcing requests, status and invoices for ${BRAND.name}.`,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: BRAND.name },
};

export const viewport: Viewport = {
  themeColor: "#f2e9da",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
