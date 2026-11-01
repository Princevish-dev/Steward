"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/core/auth/use-session";

export function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const { user, isAuthenticated, loading, loginDemo, loginWithEmail, logout } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const res = await loginDemo();
      if (res.ok) {
        setShowLoginModal(false);
        if (pathname === "/") {
          window.location.href = "/dashboard";
        } else {
          window.location.reload();
        }
      } else {
        setLoginError(res.error ?? "Failed to initialize demo session.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setLoginError("Please enter an email address.");
      return;
    }
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const res = await loginWithEmail(emailInput.trim());
      if (res.ok) {
        setShowLoginModal(false);
        if (pathname === "/") {
          window.location.href = "/dashboard";
        } else {
          window.location.reload();
        }
      } else {
        setLoginError(res.error ?? "Authentication failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-surface/90 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
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

        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
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

        <div className="flex items-center gap-3">
          <nav className="hidden xl:flex items-center gap-4 text-xs font-medium">
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
                {user.role === "judge" && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 uppercase font-semibold">
                    Judge
                  </span>
                )}
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
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-primary-text transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Instant one-click judge evaluation access (FR-27)"
              >
                <span>⚡</span>
                <span>{isSubmitting ? "Loading..." : "Demo Login"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-border rounded-md transition cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Clean Stateless Sign-In Modal */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 id="login-modal-title" className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <span>🛡️</span> Sign In to Steward AI
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Authenticate your session to manage governed purchases and view ledger audits.
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface cursor-pointer text-sm"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="mb-4 rounded-md border border-error bg-error-bg p-3 text-xs text-error">
                {loginError}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-text-secondary mb-1">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-primary hover:bg-primary-hover text-primary-text font-semibold py-2 text-sm transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Authenticating..." : "Sign In with Email"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">Or Fast Access</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full rounded-md border border-secondary/50 bg-secondary/10 hover:bg-secondary/20 text-secondary font-medium py-2 text-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>⚡</span> One-Click Judge Access (judge@example.com)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
