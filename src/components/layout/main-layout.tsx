"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TopNav } from "./top-nav";
import { MobileSidebar } from "./sidebar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="border-t border-border bg-surface py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div>
            Steward AI — Mandate-governed autonomous purchasing. PayPal Sandbox + SHA-256 audit ledger.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="hover:text-text-primary">Dashboard</Link>
            <Link href="/mandates" className="hover:text-text-primary">Mandates</Link>
            <Link href="/ledger" className="hover:text-text-primary">Ledger</Link>
            <Link href="/redteam" className="hover:text-text-primary">Red-Team</Link>
            <Link href="/mcp" className="hover:text-text-primary">MCP</Link>
            <Link href="/api-docs" className="hover:text-text-primary">API Documentation</Link>
            <Link href="/settings" className="hover:text-text-primary">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
