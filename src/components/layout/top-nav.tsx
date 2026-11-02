"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/core/auth/use-session";

export function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout } = useSession();

  const mainNav = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "New Mandate", href: "/new" },
    { label: "Approvals", href: "/approvals" },
    { label: "Orders", href: "/orders" },
    { label: "Ledger", href: "/ledger" }
  ];

  const secondaryNav = [
    { label: "Mandates", href: "/mandates" },
    { label: "Purchase Requests", href: "/purchase-requests" },
    { label: "Payments", href: "/payments" }
  ];

  return (
    <header className="h-16 border-b border-border bg-surface/90 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated focus-visible-outline cursor-pointer"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="font-bold text-text-primary hidden sm:block tracking-tight">Steward AI</span>
        </Link>
      </div>

      {isAuthenticated && (
        <div className="flex items-center gap-3 lg:gap-5">
          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium">
            {mainNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-colors py-1 ${
                  pathname === item.href
                    ? "text-primary border-b-2 border-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Prominent Red-Team Adversarial Lab Button */}
          <Link
            href="/redteam"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition shadow-sm ${
              pathname === "/redteam"
                ? "border-red-500 bg-red-500/25 text-red-200 ring-1 ring-red-500"
                : "border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 hover:border-red-400"
            }`}
            title="Red-Team Adversarial Safety Lab (FR-24, FR-25)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>🛡️ Red-Team Lab</span>
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <nav className="hidden xl:flex items-center gap-3 text-xs font-medium">
            {secondaryNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-colors ${
                  pathname === item.href
                    ? "text-text-primary font-semibold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Authentication State Controls */}
        {loading ? (
          <div className="h-8 w-24 bg-surface-elevated animate-pulse rounded-md" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface-elevated text-xs text-text-primary max-w-[180px] sm:max-w-[220px]"
              title={user.email}
            >
              <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
              <span className="truncate font-medium">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-border rounded-md transition cursor-pointer"
              aria-label="Log out of Steward"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-primary-text transition shadow-sm cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
