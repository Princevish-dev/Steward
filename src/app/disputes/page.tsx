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

type DisputeRow = {
  id: string;
  orderId: string;
  runId: string;
  status: string;
  createdAt: string;
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/disputes");
      if (!response.ok) throw new Error(`Failed to load disputes (${response.status}).`);
      const body = await readJson<{ disputes: DisputeRow[] }>(response);
      setDisputes(body.disputes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load disputes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

  const draftDispute = async () => {
    if (!selectedRunId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/disputes/advocate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: selectedRunId })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not draft dispute.");
      alert(JSON.stringify(body.draft ?? body, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft dispute.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Disputes" subtitle="Draft dispute evidence and manage disputes" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Disputes"
        subtitle="Draft dispute evidence using the AI Dispute Advocate"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Disputes", href: "/disputes" }]}
      />

      <section className="content-section mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Draft Dispute Evidence</h2>
        <p className="text-sm text-text-secondary mb-4">
          Generate a structured dispute evidence packet using the AI Dispute Advocate. Facts are drawn from the immutable ledger.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 max-w-md">
          <input
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            placeholder="Enter Run ID"
            className="flex-1 rounded-md border border-border bg-surface text-text-primary px-3 py-2 focus:border-border-focus focus:outline-none"
          />
          <Button variant="primary" onClick={draftDispute} disabled={!selectedRunId || loading}>
            {loading ? "Drafting..." : "Draft Dispute Evidence"}
          </Button>
        </div>
      </section>

      {disputes.length === 0 ? (
        <EmptyState
          title="No disputes"
          description="Disputes appear here when a dispute event is received or simulated."
        />
      ) : (
        <DataTable
          columns={[
            { key: "id", header: "Dispute ID", width: "25%" },
            { key: "orderId", header: "Order ID", width: "20%" },
            { key: "runId", header: "Run ID", width: "20%" },
            { key: "status", header: "Status", width: "15%" },
            { key: "createdAt", header: "Created", width: "20%" }
          ]}
          data={disputes}
          renderCell={(item, key) => {
            if (key === "status") return <StatusBadge status={item.status as any} />;
            return item[key as keyof DisputeRow];
          }}
          rowKey={(item) => item.id}
        />
      )}
    </div>
  );
}
