"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();

  const mainNav = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Mandates", href: "/mandates" },
    { label: "Purchase Requests", href: "/purchase-requests" },
    { label: "Approvals", href: "/approvals" }
  ];

  const secondaryNav = [
    { label: "Orders", href: "/orders" },
    { label: "Payments", href: "/payments" },
    { label: "Ledger", href: "/ledger" },
    { label: "Red-Team", href: "/redteam" }
  ];

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-text-secondary hover:text-text-primary hover:bg-surface focus-visible-outline"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="font-bold text-text-primary hidden sm:block">Steward AI</span>
        </Link>
      </div>
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        {mainNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`text-text-secondary hover:text-text-primary ${
              pathname === item.href ? "text-primary border-b-2 border-primary" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="hidden md:flex items-center gap-4 text-sm">
        {secondaryNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-text-muted hover:text-text-primary focus-visible-outline"
          >
            {item.label}
          </Link>
        ))}
        <Link href="/" className="text-xs text-text-muted hover:text-text-primary focus-visible-outline">
          Logout
        </Link>
      </nav>
    </header>
  );
}
