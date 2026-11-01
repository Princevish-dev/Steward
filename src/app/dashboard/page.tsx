"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import dynamic from "next/dynamic";

const LedgerGrid = dynamic(() => import("./LedgerGrid"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-lg bg-surface animate-pulse" />
});

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

type MandateRow = {
  id: string;
  owner: string;
  purpose: string;
  status: string;
  period: { type: string; budget: number };
  caps: { perItem: number | null; perTransaction: number | null; maxQuantityPerItem: number };
  askAbove: number | null;
  categories: string[];
  expiresAt: string;
};

type RunRow = {
  run_id: string;
  mandate_id: string;
  task: string;
  decision: string;
  cart: unknown;
  created_at: string;
  total: number;
};

type ApprovalRow = {
  id: string;
  run_id: string;
  status: string;
  total?: number;
  reason?: string;
  expires_at?: string;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<{ title: string; value: string | number }[]>([]);
  const [mandates, setMandates] = useState<MandateRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [ledgerValid, setLedgerValid] = useState<boolean | null>(null);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mandatesResp, runsResp, approvalsResp, ledgerResp] = await Promise.all([
        fetch("/api/mandates").then((r) => r.ok ? readJson<{ mandates: MandateRow[] }>(r) : { mandates: [] }),
        fetch("/api/runs").then((r) => r.ok ? readJson<{ runs: RunRow[] }>(r) : { runs: [] }),
        fetch("/api/approvals").then((r) => r.ok ? readJson<{ approvals: ApprovalRow[] }>(r) : { approvals: [] }),
        fetch("/api/ledger/verify").then((r) => r.ok ? readJson<{ verification?: { valid: boolean } }>(r) : { verification: { valid: false } } as { verification?: { valid: boolean } })
      ]);
      setMandates(mandatesResp.mandates ?? []);
      setRuns(runsResp.runs ?? []);
      setApprovals(approvalsResp.approvals ?? []);
      setLedgerValid(ledgerResp.verification?.valid ?? null);

      const activeMandates = (mandatesResp.mandates ?? []).filter((m) => m.status === "ACTIVE").length;
      const pendingApprovals = (approvalsResp.approvals ?? []).filter((a) => a.status === "PENDING").length;
      const autoApproved = (runsResp.runs ?? []).filter((r) => r.decision === "AUTO_APPROVE").length;
      const blocked = (runsResp.runs ?? []).filter((r) => r.decision === "BLOCK").length;
      const totalSpending = (runsResp.runs ?? []).reduce((sum, r) => sum + Number(r.total || 0), 0);

      setMetrics([
        { title: "Active Mandates", value: activeMandates },
        { title: "Purchase Requests", value: (runsResp.runs ?? []).length },
        { title: "Pending Approvals", value: pendingApprovals },
        { title: "Auto-Approved", value: autoApproved },
        { title: "Blocked Purchases", value: blocked },
        { title: "Total Governed Spending", value: `$${totalSpending.toFixed(2)}` }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Control Room" subtitle="Your mandate-governed purchasing command center" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-surface animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="Control Room" subtitle="Your mandate-governed purchasing command center" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load dashboard</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={refreshDashboard} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Control Room"
        subtitle="Your mandate-governed purchasing command center"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}
        action={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={refreshDashboard}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/new">Create Mandate</Link>
            </Button>
          </div>
        }
      />

      {/* System Status */}
      <section className="content-section">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-text-secondary">Database Connected</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-text-secondary">PayPal Sandbox</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-text-secondary">AI Provider</span>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="content-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </section>

      {/* Active Mandates */}
      <section className="content-section">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Active Mandates</h2>
          <Link href="/mandates" className="text-sm text-primary hover:text-primary-hover focus-visible-outline">
            View all →
          </Link>
        </div>
        {mandates.length === 0 ? (
          <EmptyState
            title="No mandates yet"
            description="Create your first mandate to start governing AI purchases."
            action={<Button variant="primary" size="sm" asChild><Link href="/new">Create Mandate</Link></Button>}
          />
        ) : (
          <DataTable
            columns={[
              { key: "purpose", header: "Purpose", width: "40%" },
              { key: "status", header: "Status", width: "20%" },
              { key: "budget", header: "Monthly Budget", width: "20%" },
              { key: "perItem", header: "Per-Item Cap", width: "20%" }
            ]}
            data={mandates}
            renderCell={(item, key) => {
              if (key === "status") return <StatusBadge status={item.status as any} />;
              if (key === "budget") return `$${item.period.budget.toFixed(2)}`;
              if (key === "perItem") return item.caps.perItem !== null ? `$${item.caps.perItem}` : "—";
              return item.purpose;
            }}
            rowKey={(item) => item.id}
          />
        )}
      </section>

      {/* Recent Purchase Activity */}
      <section className="content-section">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Purchase Activity</h2>
          <Link href="/purchase-requests" className="text-sm text-primary hover:text-primary-hover focus-visible-outline">
            View all →
          </Link>
        </div>
        {runs.length === 0 ? (
          <EmptyState
            title="No purchase requests yet"
            description="Start a governed purchase from your dashboard or mandate page."
            action={<Button variant="primary" size="sm" asChild><Link href="/new">Create Mandate</Link></Button>}
          />
        ) : (
          <DataTable
            columns={[
              { key: "run_id", header: "Run ID", width: "25%" },
              { key: "decision", header: "Decision", width: "20%" },
              { key: "total", header: "Total", width: "15%" },
              { key: "created_at", header: "Created", width: "40%" }
            ]}
            data={runs}
            renderCell={(item, key) => {
              if (key === "decision") return <StatusBadge status={item.decision as any} />;
              if (key === "total") return `$${Number(item.total || 0).toFixed(2)}`;
              return item[key as keyof RunRow] as React.ReactNode;
            }}
            rowKey={(item) => item.run_id}
          />
        )}
      </section>

      {/* Approval Inbox Preview */}
      <section className="content-section">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Approval Inbox</h2>
          <Link href="/approvals" className="text-sm text-primary hover:text-primary-hover focus-visible-outline">
            View all →
          </Link>
        </div>
        {(() => {
          const pending = approvals.filter((a) => a.status === "PENDING");
          if (pending.length === 0) {
            return (
              <EmptyState
                title="No pending approvals"
                description="All purchase requests have been reviewed."
              />
            );
          }
          return (
            <div className="space-y-3">
              {pending.map((approval) => (
                <div key={approval.id} className="rounded-lg border border-border bg-surface-elevated p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-text-primary">{approval.run_id}</span>
                    <StatusBadge status={approval.status as any} size="sm" />
                  </div>
                  <p className="text-sm text-text-secondary">{approval.reason ?? "Awaiting human review."}</p>
                  {approval.total !== undefined && (
                    <p className="text-sm text-text-primary mt-1">Total: ${Number(approval.total).toFixed(2)}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="success" size="sm" onClick={() => {}}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => {}}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Audit Ledger Preview */}
      <section className="content-section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Audit Ledger</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${ledgerValid ? "text-success" : ledgerValid === false ? "text-error" : "text-text-muted"}`}>
              {ledgerValid === true ? "Valid — Verified" : ledgerValid === false ? "Tampered — Invalid" : "Not Verified"}
            </span>
            <Button variant="secondary" size="sm">Verify</Button>
          </div>
        </div>
        <LedgerGrid rows={[]} valid={ledgerValid} onVerify={() => {}} mandateId={mandateId ?? undefined} />
      </section>

      {/* Quick Actions */}
      <section className="content-section">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="primary" size="md" asChild>
            <Link href="/new">Create Mandate</Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/approvals">Review Approvals</Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/ledger">Open Ledger</Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/redteam">Red-Team Lab</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
