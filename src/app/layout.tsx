import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "Steward",
  description: "Mandate-based purchasing with deterministic safety controls."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{<MainLayout>{children}</MainLayout>}</body>
    </html>
  );
}
