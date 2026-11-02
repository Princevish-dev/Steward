import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";

const publicBaseUrl = process.env.APP_BASE_URL?.trim() || "https://steward-w7pk.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(publicBaseUrl),
  title: {
    template: "%s | Steward AI",
    default: "Steward AI — Autonomous Shopping with User Control"
  },
  description: "Give your AI agent a mandate, not your credit card. Deterministic policy enforcement, human oversight, PayPal Sandbox execution, and SHA-256 hash-chained audit ledger.",
  keywords: [
    "steward ai",
    "mandate-governed purchasing",
    "AI agent spending limits",
    "deterministic policy engine",
    "PayPal Sandbox",
    "audit ledger",
    "fintech",
    "autonomous commerce"
  ],
  authors: [{ name: "Steward AI" }],
  openGraph: {
    title: "Steward AI — Give your AI agent a mandate, not your credit card.",
    description: "Mandate-governed autonomous purchasing platform with deterministic policy enforcement, human oversight, and SHA-256 audit ledger.",
    type: "website",
    locale: "en_US",
    siteName: "Steward AI",
    images: [
      {
        url: "/favicon.svg",
        width: 32,
        height: 32,
        alt: "Steward AI logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Steward AI",
    description: "Give your AI agent a mandate, not your credit card.",
    images: ["/favicon.svg"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b1020" />
      </head>
      <body className="bg-background text-text-primary antialiased font-sans">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
