"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { DataTable } from "@/components/ui/data-table";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

type RunRow = {
  run_id: string;
  mandate_id: string;
  task: string;
  decision: string;
  cart: unknown;
  created_at: string;
  total: number;
};

export default function PurchaseRequestsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/runs");
      if (!response.ok) throw new Error(`Failed to load purchase requests (${response.status}).`);
      const body = await readJson<{ runs: RunRow[] }>(response);
      setRuns(body.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load purchase requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Purchase Requests" subtitle="Review all purchase requests and their decisions" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="Purchase Requests" subtitle="Review all purchase requests and their decisions" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load purchase requests</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchRuns} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Purchase Requests"
        subtitle="Review all purchase requests and their policy decisions"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase Requests", href: "/purchase-requests" }]}
      />

      {runs.length === 0 ? (
        <EmptyState
          title="No purchase requests"
          description="Start a governed purchase from your dashboard to create purchase requests."
          action={<Button variant="primary" size="sm" asChild><Link href="/new">Create Mandate</Link></Button>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "run_id", header: "Run ID", width: "20%" },
            { key: "mandate_id", header: "Mandate ID", width: "20%" },
            { key: "task", header: "Task", width: "30%" },
            { key: "decision", header: "Decision", width: "15%" },
            { key: "total", header: "Total", width: "15%" }
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
    </div>
  );
}
