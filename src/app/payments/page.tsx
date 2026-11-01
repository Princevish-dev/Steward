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

type PaymentRow = {
  orderId: string;
  runId: string;
  captureId: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments");
      if (response.status === 401) {
        setPayments([]);
        return;
      }
      if (!response.ok) throw new Error(`Failed to load payments (${response.status}).`);
      const body = await readJson<{ payments: PaymentRow[] }>(response);
      setPayments(body.payments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Payments" subtitle="View payment status and transaction history" />
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
        <PageHeader title="Payments" subtitle="View payment status and transaction history" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load payments</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchPayments} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Payments"
        subtitle="View payment status and transaction history"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Payments", href: "/payments" }]}
      />

      {payments.length === 0 ? (
        <EmptyState
          title="No payments"
          description="Payments appear here after a PayPal order is captured."
        />
      ) : (
        <DataTable
          columns={[
            { key: "orderId", header: "Order ID", width: "20%" },
            { key: "runId", header: "Run ID", width: "18%" },
            { key: "captureId", header: "Capture ID", width: "18%" },
            { key: "amount", header: "Amount", width: "12%" },
            { key: "status", header: "Status", width: "15%" },
            { key: "createdAt", header: "Created", width: "17%" }
          ]}
          data={payments}
          renderCell={(item, key) => {
            if (key === "status") return <StatusBadge status={item.status as any} />;
            if (key === "amount") return `$${item.amount.toFixed(2)}`;
            if (key === "captureId") return item.captureId ?? "—";
            return item[key as keyof PaymentRow];
          }}
          rowKey={(item) => item.orderId}
        />
      )}
    </div>
  );
}
