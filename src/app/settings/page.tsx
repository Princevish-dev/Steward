"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

export default function SettingsPage() {
  const [paypalHealth, setPaypalHealth] = useState<{ connected: boolean; environment?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPaypalHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/paypal/health");
      if (response.ok) {
        setPaypalHealth(await readJson<{ connected: boolean; environment: string }>(response));
      } else {
        setPaypalHealth({ connected: false, error: `HTTP ${response.status}` });
      }
    } catch (err) {
      setPaypalHealth({ connected: false, error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPaypalHealth();
  }, [fetchPaypalHealth]);

  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        subtitle="Account and integration settings"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings", href: "/settings" }]}
      />

      <section className="content-section mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Account</h2>
        <div className="rounded-lg border border-border bg-surface-elevated p-6">
          <p className="text-sm text-text-secondary">
            Account settings are managed through your session cookie. Use the magic-link flow to authenticate with a different email.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/api/auth/logout">Logout</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="content-section mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Integrations</h2>
        <div className="space-y-4">
          <div className={`rounded-lg border p-4 bg-surface-elevated ${paypalHealth?.connected ? "border-success bg-success/10" : "border-error bg-error/10"}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">PayPal Sandbox</h4>
                <p className="text-xs text-text-secondary">
                  Sandbox environment for safe payment testing. {paypalHealth?.environment ? `Environment: {paypalHealth.environment}` : ""}
                </p>
                <p className="text-xs font-semibold mt-1">
                  {paypalHealth?.connected ? "Connected" : "Disconnected"}
                </p>
                {paypalHealth?.error && <p className="text-xs text-error">{paypalHealth.error}</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={fetchPaypalHealth}>
                Check Status
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-4 flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Channel3 Catalog</h4>
              <p className="text-xs text-text-secondary">Product search for AI shopping agent.</p>
            </div>
            <Button variant="secondary" size="sm">Configure</Button>
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Security</h2>
        <div className="rounded-lg border border-border bg-surface-elevated p-6">
          <p className="text-sm text-text-secondary">
            API keys are scoped to individual mandates and stored as SHA-256 hashes. Session cookies are HMAC-signed.
          </p>
          <div className="mt-4 p-3 rounded-md border border-warning/30 bg-warning/10">
            <p className="text-xs font-semibold text-warning mb-1">Transparency</p>
            <p className="text-xs text-text-secondary">
              PayPal Vault (approve-once payments) is not available in Sandbox due to developer account permissions.
              Each order requires explicit buyer approval.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
