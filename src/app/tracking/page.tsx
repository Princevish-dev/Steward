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

type TrackingRow = {
  orderId: string;
  runId: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  simulated: boolean;
  createdAt: string;
};

export default function TrackingPage() {
  const [tracking, setTracking] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tracking");
      if (!response.ok) throw new Error(`Failed to load tracking (${response.status}).`);
      const body = await readJson<{ tracking: TrackingRow[] }>(response);
      setTracking(body.tracking ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tracking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTracking();
  }, [fetchTracking]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Tracking" subtitle="View shipment tracking information" />
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
        <PageHeader title="Tracking" subtitle="View shipment tracking information" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load tracking</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchTracking} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Tracking"
        subtitle="View shipment tracking information"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Tracking", href: "/tracking" }]}
      />

      {tracking.length === 0 ? (
        <EmptyState
          title="No tracking information"
          description="Tracking details appear here after a payment is captured and simulated shipping is assigned."
          action={<p className="text-xs text-text-muted">Carrier: SIMULATED_CARRIER (simulated for development)</p>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "orderId", header: "Order ID", width: "20%" },
            { key: "runId", header: "Run ID", width: "18%" },
            { key: "carrier", header: "Carrier", width: "18%" },
            { key: "trackingNumber", header: "Tracking Number", width: "22%" },
            { key: "status", header: "Status", width: "12%" },
            { key: "createdAt", header: "Created", width: "10%" }
          ]}
          data={tracking}
          renderCell={(item, key) => {
            if (key === "status") return <StatusBadge status={item.status as any} />;
            if (key === "carrier") {
              return (
                <span className="flex items-center gap-1">
                  <span className="text-xs text-warning">SIM</span>
                  {item.carrier}
                </span>
              );
            }
            return item[key as keyof TrackingRow];
          }}
          rowKey={(item) => item.orderId}
        />
      )}
    </div>
  );
}
