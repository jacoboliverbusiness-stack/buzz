import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${BRAND.full} — ${BRAND.tagline}`, template: `%s · ${BRAND.product}` },
  description: "Paste your Hudl profile. Scout finds colleges that fit you, connects you with the right coaches, and drafts your recruiting outreach.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
