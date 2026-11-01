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

type ApprovalRow = {
  id: string;
  run_id: string;
  status: string;
  total?: number;
  reason?: string;
  expires_at?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{ id: string; status: "APPROVED" | "REJECTED" } | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/approvals");
      const body = await readJson<{ approvals: ApprovalRow[] }>(response);
      setApprovals(body.approvals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApprovals();
  }, [fetchApprovals]);

  const resolveApproval = async (id: string, status: "APPROVED" | "REJECTED") => {
    setLoading(true);
    try {
      const response = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, reviewer: "dashboard-user" })
      });
      const body = await readJson<{ approval?: ApprovalRow; error?: string }>(response);
      if (!response.ok || !body.approval) {
        throw new Error(body.error ?? `Could not ${status.toLowerCase()} approval.`);
      }
      void fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${status.toLowerCase()} approval.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Approval Inbox" subtitle="Review and resolve pending purchase requests" />
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
        <PageHeader title="Approval Inbox" subtitle="Review and resolve pending purchase requests" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load approvals</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button onClick={fetchApprovals} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pending = approvals.filter((a) => a.status === "PENDING");
  const resolved = approvals.filter((a) => a.status !== "PENDING");

  return (
    <div className="page-container">
      <PageHeader
        title="Approval Inbox"
        subtitle="Review and resolve pending purchase requests"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Approvals", href: "/approvals" }]}
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="All purchase requests have been reviewed."
        />
      ) : (
        <section className="content-section">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Pending Approvals</h2>
          <div className="space-y-3">
            {pending.map((approval) => (
              <div key={approval.id} className="rounded-lg border border-border bg-surface-elevated p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{approval.run_id}</p>
                    <p className="text-xs text-text-secondary">{approval.reason ?? "Awaiting human review."}</p>
                  </div>
                  <div className="text-right">
                    {approval.total !== undefined && (
                      <p className="text-sm font-semibold text-text-primary">${approval.total.toFixed(2)}</p>
                    )}
                    <p className="text-xs text-text-muted">{new Date(approval.expires_at ?? Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setPendingApproval({ id: approval.id, status: "APPROVED" });
                      setConfirmOpen(true);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setPendingApproval({ id: approval.id, status: "REJECTED" });
                      setConfirmOpen(true);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="content-section">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Resolved Approvals</h2>
          <DataTable
            columns={[
              { key: "run_id", header: "Run ID", width: "25%" },
              { key: "status", header: "Status", width: "15%" },
              { key: "total", header: "Total", width: "15%" },
              { key: "reason", header: "Reason", width: "45%" }
            ]}
            data={resolved}
            renderCell={(item, key) => {
              if (key === "status") return <StatusBadge status={item.status as any} />;
              if (key === "total") return item.total !== undefined ? `$${item.total.toFixed(2)}` : "—";
              return item[key as keyof ApprovalRow];
            }}
            rowKey={(item) => item.id}
          />
        </section>
      )}

      <ConfirmationDialog
        isOpen={confirmOpen}
        title={pendingApproval ? `Confirm ${pendingApproval.status.toLowerCase()}` : ""}
        description={pendingApproval ? `Are you sure you want to ${pendingApproval.status.toLowerCase()} this approval request?` : ""}
        confirmLabel="Confirm"
        confirmVariant={pendingApproval?.status === "APPROVED" ? "success" : "danger"}
        onConfirm={() => {
          if (pendingApproval) {
            resolveApproval(pendingApproval.id, pendingApproval.status);
          }
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
