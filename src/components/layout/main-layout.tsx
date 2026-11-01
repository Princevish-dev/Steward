"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TopNav } from "./top-nav";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav onMenuToggle={() => {}} />
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="border-t border-border bg-surface py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-text-muted">
          Steward AI — Mandate-governed autonomous purchasing. PayPal Sandbox + SHA-256 audit ledger.
        </div>
      </footer>
    </div>
  );
}
