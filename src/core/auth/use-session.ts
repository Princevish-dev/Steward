"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/core/auth/session";

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json() as { authenticated?: boolean; user?: SessionUser | null };
        setUser(data.authenticated && data.user ? data.user : null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginWithEmail = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json() as { ok?: boolean; error?: string; user?: SessionUser };
      if (res.ok && data.ok && data.user) {
        setUser(data.user);
        return { ok: true, user: data.user };
      }
      return { ok: false, error: data.error ?? "Login failed" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch {
      setUser(null);
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    loading,
    refresh,
    loginWithEmail,
    logout
  };
}
