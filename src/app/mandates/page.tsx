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

export default function MandatesPage() {
  const [mandates, setMandates] = useState<MandateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMandates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mandates");
      if (!response.ok) throw new Error(`Failed to load mandates (${response.status}).`);
      const body = await readJson<{ mandates: MandateRow[] }>(response);
      setMandates(body.mandates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load mandates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMandates();
  }, [fetchMandates]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Mandates" subtitle="Manage your spending mandates" />
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
        <PageHeader title="Mandates" subtitle="Manage your spending mandates" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load mandates</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchMandates} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Mandates"
        subtitle="Manage your spending mandates"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Mandates", href: "/mandates" }]}
        action={
          <Button variant="primary" size="sm" asChild>
            <Link href="/new">Create Mandate</Link>
          </Button>
        }
      />

      {mandates.length === 0 ? (
        <EmptyState
          title="No mandates found"
          description="Create your first mandate to start governing AI purchases."
          action={<Button variant="primary" size="sm" asChild><Link href="/new">Create Mandate</Link></Button>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "id", header: "Mandate ID", width: "20%" },
            { key: "purpose", header: "Purpose", width: "35%" },
            { key: "status", header: "Status", width: "15%" },
            { key: "budget", header: "Monthly Budget", width: "15%" },
            { key: "perItem", header: "Per-Item Cap", width: "15%" }
          ]}
          data={mandates}
          renderCell={(item, key) => {
            if (key === "status") return <StatusBadge status={item.status as any} />;
            if (key === "budget") return `$${item.period.budget.toFixed(2)}`;
            if (key === "perItem") return item.caps.perItem !== null ? `$${item.caps.perItem}` : "—";
            return item[key as keyof MandateRow] as React.ReactNode;
          }}
          rowKey={(item) => item.id}
        />
      )}
    </div>
  );
}
