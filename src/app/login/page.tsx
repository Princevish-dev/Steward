"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/core/auth/use-session";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const { isAuthenticated, loading: sessionLoading, loginWithEmail } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to nextUrl or dashboard immediately
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      router.replace(nextUrl);
    }
  }, [isAuthenticated, sessionLoading, nextUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await loginWithEmail(email.trim());
      if (res.ok) {
        window.location.href = nextUrl;
      } else {
        setError(res.error ?? "Authentication failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-8 shadow-2xl relative z-10 backdrop-blur-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <span className="text-2xl group-hover:scale-105 transition-transform">🛡️</span>
          <span className="font-extrabold text-xl text-text-primary tracking-tight">Steward AI</span>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Sign In to Control Room</h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          Enter your email to authenticate and access mandate-governed purchasing.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-error bg-error-bg p-3.5 text-xs text-error flex items-start gap-2 animate-in fade-in">
          <span className="font-bold">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none transition"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="password" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Password <span className="text-[10px] text-text-muted font-normal lowercase">(optional)</span>
            </label>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none transition"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-semibold py-3 text-sm transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-text border-t-transparent rounded-full animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In →</span>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <Link
          href="/"
          className="text-xs text-text-muted hover:text-text-primary transition inline-flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Back to Landing Page</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/10 blur-[140px] pointer-events-none rounded-full" />

      <Suspense fallback={<div className="h-96 w-full max-w-md bg-surface-elevated animate-pulse rounded-2xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

