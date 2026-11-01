import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "Steward AI — Autonomous Shopping with User Control",
  description: "Give your AI agent a mandate, not your credit card. Deterministic policy enforcement, human oversight, PayPal Sandbox execution, and SHA-256 hash-chained audit ledger."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary antialiased font-sans">
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
