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

type LedgerRow = {
  sequence: number;
  timestamp: string;
  type: string;
  runId: string;
  entryHash: string;
  decision?: string;
  rationale?: string;
};

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = mandateId
        ? `/api/ledger/verify?mandateId=${encodeURIComponent(mandateId)}`
        : "/api/ledger/verify";
      const response = await fetch(url);
      const body = await readJson<{ entries?: LedgerRow[]; verification?: { valid: boolean } }>(response);
      setEntries(body.entries ?? []);
      setValid(body.verification?.valid ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ledger.");
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void fetchLedger();
  }, [fetchLedger]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Audit Ledger" subtitle="Tamper-evident SHA-256 hash-chained audit trail" />
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
        <PageHeader title="Audit Ledger" subtitle="Tamper-evident SHA-256 hash-chained audit trail" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load ledger</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Audit Ledger"
        subtitle="Tamper-evident SHA-256 hash-chained audit trail"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit Ledger", href: "/ledger" }]}
      />

      <section className="content-section mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className={`px-3 py-1.5 rounded-md border ${valid ? "border-success bg-success/10" : valid === false ? "border-error bg-error/10" : "border-border bg-surface"}`}>
            <span className={`text-xs font-medium ${valid ? "text-success" : valid === false ? "text-error" : "text-text-muted"}`}>
              {valid === true ? "Valid — Verified" : valid === false ? "Tampered — Invalid" : "Not Verified"}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchLedger}>
            Verify Cryptographic Ledger
          </Button>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary">Filter by Mandate</label>
            <input
              type="text"
              value={mandateId ?? ""}
              placeholder="mandate ID"
              className="rounded-md border border-border bg-surface text-text-primary px-3 py-1.5 text-xs focus:border-border-focus focus:outline-none"
              onChange={(e) => setMandateId(e.target.value || null)}
            />
          </div>
        </div>
      </section>

      {entries.length === 0 ? (
        <EmptyState
          title="No ledger entries"
          description="Ledger entries appear here as mandates, purchases, approvals, and payments are recorded."
        />
      ) : (
        <DataTable
          columns={[
            { key: "sequence", header: "Seq", width: "10%" },
            { key: "timestamp", header: "Timestamp", width: "25%" },
            { key: "type", header: "Event Type", width: "20%" },
            { key: "runId", header: "Run ID", width: "20%" },
            { key: "decision", header: "Decision", width: "15%" },
            { key: "entryHash", header: "Entry Hash", width: "25%" }
          ]}
          data={entries}
          renderCell={(item, key) => {
            if (key === "decision") return <StatusBadge status={item.decision as any} size="sm" />;
            if (key === "entryHash") return <code className="text-xs text-text-secondary truncate">{item.entryHash.slice(0, 16)}...</code>;
            return item[key as keyof LedgerRow];
          }}
          rowKey={(item) => String(item.sequence)}
        />
      )}

      <section className="content-section mt-8">
        <h3 className="text-sm font-semibold text-text-primary mb-3">About the Ledger</h3>
        <p className="text-sm text-text-secondary">
          Every state transition — mandate creation, policy decision, approval, order capture, refund, and webhook —
          is recorded in an SHA-256 hash-chained audit trail. Each entry contains the hash of the previous entry,
          making the chain tamper-evident. Use the Export buttons on the dashboard to download CSV or JSON.
        </p>
      </section>
    </div>
  );
}
