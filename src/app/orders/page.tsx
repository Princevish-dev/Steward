"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

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
  reconciliation_status?: "PENDING" | "RECONCILED" | "MISMATCH";
  reconciliation_sequence?: number | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<OrderRow | null>(null);
  const [refundChallenge, setRefundChallenge] = useState<{ nonce: string; prompt: string } | null>(null);
  const [refundPhrase, setRefundPhrase] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/paypal/orders");
      if (response.status === 401) {
        setOrders([]);
        return;
      }
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

  const beginRefund = async (order: OrderRow) => {
    setRefundLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await fetch("/api/paypal/refund/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: order.run_id })
      });
      const body = await readJson<{ nonce?: string; prompt?: string; error?: string }>(response);
      if (!response.ok || !body.nonce || !body.prompt) throw new Error(body.error ?? "Could not prepare the refund.");
      setRefundTarget(order);
      setRefundChallenge({ nonce: body.nonce, prompt: body.prompt });
      setRefundPhrase("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not prepare the refund.");
    } finally {
      setRefundLoading(false);
    }
  };

  const submitRefund = async () => {
    if (!refundTarget || !refundChallenge) return;
    setRefundLoading(true);
    setActionError(null);
    try {
      const response = await fetch("/api/paypal/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: refundTarget.run_id, confirmation: { nonce: refundChallenge.nonce, phrase: refundPhrase } })
      });
      const body = await readJson<{ refundId?: string; error?: string; paypalConfirmed?: boolean }>(response);
      if (!response.ok || !body.refundId) throw new Error(body.error ?? "Refund could not be completed.");
      setActionMessage(body.paypalConfirmed ? `Refund ${body.refundId} completed and PayPal confirmed it.` : `Refund ${body.refundId} completed.`);
      setRefundTarget(null);
      setRefundChallenge(null);
      setRefundPhrase("");
      await fetchOrders();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Refund could not be completed.");
    } finally {
      setRefundLoading(false);
    }
  };

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

      {actionError && <p role="alert" className="mb-4 rounded border border-error p-3 text-sm text-error">{actionError}</p>}
      {actionMessage && <p role="status" className="mb-4 rounded border border-success p-3 text-sm text-success">{actionMessage}</p>}

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
            { key: "created_at", header: "Created", width: "15%" },
            { key: "actions", header: "Actions", width: "12%" }
          ]}
          data={orders}
          renderCell={(item, key) => {
            if (key === "status") return (
              <div className="space-y-1">
                <StatusBadge status={item.status as any} />
                {item.reconciliation_status === "RECONCILED" && (
                  <span className="block text-[10px] font-semibold text-success" title="PayPal REST witness matched amount, currency, and status">
                    ✓ PayPal confirmed · {item.id.slice(-6)} · ledger #{item.reconciliation_sequence ?? "?"}
                  </span>
                )}
                {item.reconciliation_status === "MISMATCH" && (
                  <span className="block text-[10px] font-semibold text-error" title="Further payment actions are blocked">
                    PayPal mismatch · blocked
                  </span>
                )}
              </div>
            );
            if (key === "amount") return `$${Number(item.amount || 0).toFixed(2)}`;
            if (key === "capture_id") return item.capture_id ?? "—";
            if (key === "actions") {
              const refundable = (item.status === "PAID" || item.status === "COMPLETED") && Boolean(item.capture_id) && item.reconciliation_status !== "MISMATCH";
              return refundable ? (
                <Button variant="secondary" size="sm" disabled={refundLoading} onClick={() => void beginRefund(item)}>
                  {refundLoading && refundTarget?.id === item.id ? "Preparing..." : "Refund"}
                </Button>
              ) : item.reconciliation_status === "MISMATCH" ? (
                <span className="text-[10px] font-semibold text-error">Blocked</span>
              ) : "—";
            }
            return item[key as keyof OrderRow];
          }}
          rowKey={(item) => item.id}
        />
      )}

      <ConfirmationDialog
        isOpen={Boolean(refundTarget && refundChallenge)}
        title="Confirm PayPal refund"
        description="The refund amount is read from the captured order on the server. This one-time challenge expires in five minutes."
        confirmLabel="Refund in PayPal Sandbox"
        confirmVariant="danger"
        confirmDisabled={!refundChallenge || refundPhrase !== refundChallenge.prompt}
        confirmLoading={refundLoading}
        onConfirm={() => void submitRefund()}
        onCancel={() => { setRefundTarget(null); setRefundChallenge(null); setRefundPhrase(""); }}
      >
        {refundChallenge && (
          <label className="mb-5 block text-sm text-text-primary">
            Type <span className="font-mono font-semibold">{refundChallenge.prompt}</span>
            <input
              autoFocus
              value={refundPhrase}
              onChange={(event) => setRefundPhrase(event.target.value)}
              aria-label={`Type ${refundChallenge.prompt} to refund`}
              className="mt-2 w-full rounded border border-border bg-surface px-3 py-2 font-mono"
            />
          </label>
        )}
      </ConfirmationDialog>
    </div>
  );
}
