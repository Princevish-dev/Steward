"use client";

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

type RefundRow = {
  refundId: string;
  orderId: string;
  runId: string;
  amount: number | null;
  status: string;
  createdAt: string;
};

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/refunds");
      if (!response.ok) throw new Error(`Failed to load refunds (${response.status}).`);
      const body = await readJson<{ refunds: RefundRow[] }>(response);
      setRefunds(body.refunds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load refunds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRefunds();
  }, [fetchRefunds]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Refunds" subtitle="View and manage PayPal Sandbox refunds" />
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
        <PageHeader title="Refunds" subtitle="View and manage PayPal Sandbox refunds" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load refunds</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchRefunds} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Refunds"
        subtitle="View and manage PayPal Sandbox refunds"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Refunds", href: "/refunds" }]}
      />

      {refunds.length === 0 ? (
        <EmptyState
          title="No refunds"
          description="Refunds appear here after a captured payment is refunded."
        />
      ) : (
        <DataTable
          columns={[
            { key: "refundId", header: "Refund ID", width: "20%" },
            { key: "orderId", header: "Order ID", width: "20%" },
            { key: "runId", header: "Run ID", width: "18%" },
            { key: "amount", header: "Amount", width: "12%" },
            { key: "status", header: "Status", width: "15%" },
            { key: "createdAt", header: "Created", width: "15%" }
          ]}
          data={refunds}
          renderCell={(item, key) => {
            if (key === "status") return <StatusBadge status={item.status as any} />;
            if (key === "amount") return item.amount !== null ? `$${item.amount.toFixed(2)}` : "—";
            return item[key as keyof RefundRow];
          }}
          rowKey={(item) => item.refundId}
        />
      )}
    </div>
  );
}
