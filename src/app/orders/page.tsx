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

type OrderRow = {
  id: string;
  run_id: string;
  amount: number;
  currency: string;
  status: string;
  approval_url: string | null;
  capture_id: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_status: string | null;
  created_at: string;
  mandate_id: string;
  run_task: string;
  run_decision: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/paypal/orders");
      if (!response.ok) throw new Error(`Failed to load orders (${response.status}).`);
      const body = await readJson<{ orders: OrderRow[] }>(response);
      setOrders(body.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Orders" subtitle="View and manage PayPal Sandbox orders" />
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
        <PageHeader title="Orders" subtitle="View and manage PayPal Sandbox orders" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load orders</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchOrders} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Orders"
        subtitle="View and manage PayPal Sandbox orders"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Orders", href: "/orders" }]}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders"
          description="Orders appear here after a purchase is approved and a PayPal order is created."
          action={<Button variant="primary" size="sm" asChild><Link href="/new">Create Mandate</Link></Button>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "id", header: "Order ID", width: "20%" },
            { key: "run_id", header: "Run ID", width: "18%" },
            { key: "amount", header: "Amount", width: "12%" },
            { key: "status", header: "Status", width: "15%" },
            { key: "capture_id", header: "Capture ID", width: "18%" },
            { key: "created_at", header: "Created", width: "17%" }
          ]}
          data={orders}
          renderCell={(item, key) => {
            if (key === "status") return <StatusBadge status={item.status as any} />;
            if (key === "amount") return `$${item.amount.toFixed(2)}`;
            if (key === "capture_id") return item.capture_id ?? "—";
            return item[key as keyof OrderRow];
          }}
          rowKey={(item) => item.id}
        />
      )}
    </div>
  );
}
