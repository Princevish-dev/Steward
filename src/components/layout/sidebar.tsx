"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/core/auth/use-session";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌘" },
  { label: "Mandates", href: "/mandates", icon: "📋" },
  { label: "New Mandate", href: "/new", icon: "✨" },
  { label: "Purchase Requests", href: "/purchase-requests", icon: "🛒" },
  { label: "Approvals", href: "/approvals", icon: "✅" },
  { label: "Orders", href: "/orders", icon: "📦" },
  { label: "Payments", href: "/payments", icon: "💳" },
  { label: "Refunds", href: "/refunds", icon: "↩️" },
  { label: "Tracking", href: "/tracking", icon: "🚚" },
  { label: "Audit Ledger", href: "/ledger", icon: "🔗" },
  { label: "Red-Team Lab", href: "/redteam", icon: "🛡️" },
  { label: "Disputes", href: "/disputes", icon: "⚖️" },
  { label: "MCP & API Keys", href: "/mcp", icon: "🔑" },
  { label: "API Documentation", href: "/api-docs", icon: "📄" },
  { label: "Settings", href: "/settings", icon: "⚙️" }
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useSession();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface-elevated transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-xl">🛡️</span>
            <span className="font-bold text-text-primary">Steward</span>
          </Link>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary focus-visible-outline cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            ✕
          </button>
        </div>

        {/* User Session in Mobile Nav */}
        <div className="px-4 py-3 border-b border-border bg-surface/50">
          {isAuthenticated && user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-primary">
                <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                <span className="truncate font-medium">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void logout();
                }}
                className="w-full text-left text-xs text-text-muted hover:text-text-primary cursor-pointer py-1"
              >
                Log Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="block w-full py-1.5 px-3 rounded text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-text transition cursor-pointer text-center"
            >
              Sign In
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-text"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-text-muted mb-2">Sandbox Mode</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-xs text-text-secondary">PayPal Sandbox Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <Sidebar isOpen={true} onClose={onClose} />
    </>
  );
}
