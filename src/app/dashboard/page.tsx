"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import dynamic from "next/dynamic";
import type { LedgerGridRow } from "./LedgerGrid";

const LedgerGrid = dynamic(() => import("./LedgerGrid"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-lg bg-surface animate-pulse" />
});

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
  totalSpent?: number;
  runsCount?: number;
};

function cleanPurposeText(purpose: string): string {
  if (!purpose) return "General Purchases";
  const title = purpose.split(/[.,;]\s*(?:maximum|max)\s/i)[0].replace(/^["']|["']$/g, "").trim();
  return title || purpose.replace(/^["']|["']$/g, "").trim();
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

type ApprovalRow = {
  id: string;
  run_id: string;
  status: string;
  total?: number;
  reason?: string;
  expires_at?: string;
};

type RunnerResult = {
  runId: string;
  decision: "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK" | string;
  total: number;
  items: Array<{ productId?: string; title?: string; unitPrice: number; quantity: number }>;
  paypalOrderId?: string | null;
  paypalApprovalUrl?: string | null;
  paypalCaptureId?: string | null;
  paypalStatus?: string | null;
  ledgerSequence?: number | null;
  reviewerRationale?: string | null;
  ruleResults?: Array<{ id: string; passed: boolean; reason: string }>;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<{ title: string; value: string | number }[]>([]);
  const [mandates, setMandates] = useState<MandateRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerGridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [ledgerValid, setLedgerValid] = useState<boolean | null>(null);
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [capturingOrder, setCapturingOrder] = useState(false);

  // Return & capture notification banner
  const [paypalBanner, setPaypalBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Agent Shopping Runner state
  const [taskPrompt, setTaskPrompt] = useState("Order 2 packs of A4 printer paper and medium roast coffee");
  const [runningRunner, setRunningRunner] = useState(false);
  const [runnerStatusMessage, setRunnerStatusMessage] = useState<string | null>(null);
  const [runnerError, setRunnerError] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<RunnerResult | null>(null);

  // Approval action state
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<{
    text: string;
    type: "success" | "error";
    approvalUrl?: string | null;
  } | null>(null);

  // Read URL query parameters on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMandateId = urlParams.get("mandateId");
      if (urlMandateId) {
        setMandateId(urlMandateId);
      }

      const paypalStatus = urlParams.get("paypal");
      const orderId = urlParams.get("orderId");
      const captureId = urlParams.get("captureId");
      const errMsg = urlParams.get("message");

      if (paypalStatus === "captured") {
        setPaypalBanner({
          type: "success",
          message: `✓ PayPal Sandbox Payment Captured! Order: ${orderId ?? "Approved"}, Capture ID: ${captureId ?? "Captured"}. Marked as PAID and cryptographically recorded in the SHA-256 Ledger.`
        });
      } else if (paypalStatus === "error") {
        setPaypalBanner({
          type: "error",
          message: `PayPal Error: ${errMsg ?? "Payment capture was not completed."}`
        });
      }
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mandatesResp, runsResp, approvalsResp, ledgerResp] = await Promise.all([
        fetch("/api/mandates").then((r) => r.ok ? readJson<{ mandates: MandateRow[] }>(r) : { mandates: [] }),
        fetch("/api/runs").then((r) => r.ok ? readJson<{ runs: RunRow[] }>(r) : { runs: [] }),
        fetch("/api/approvals").then((r) => r.ok ? readJson<{ approvals: ApprovalRow[] }>(r) : { approvals: [] }),
        fetch("/api/ledger/verify").then((r) =>
          r.ok ? readJson<{ entries?: LedgerGridRow[]; verification?: { valid: boolean } }>(r) : { entries: [], verification: { valid: false } }
        )
      ]);

      const fetchedMandates = mandatesResp.mandates ?? [];
      setMandates(fetchedMandates);
      setRuns(runsResp.runs ?? []);
      setApprovals(approvalsResp.approvals ?? []);
      setLedgerEntries(ledgerResp.entries ?? []);
      setLedgerValid(ledgerResp.verification?.valid ?? null);

      // Default active mandate selection if not set (preferring one with available budget)
      setMandateId((current) => {
        if (current && fetchedMandates.some((m) => m.id === current)) return current;
        const availableActive = fetchedMandates.find((m) => m.status === "ACTIVE" && (m.totalSpent || 0) < m.period.budget);
        if (availableActive) return availableActive.id;
        const active = fetchedMandates.find((m) => m.status === "ACTIVE");
        return active ? active.id : fetchedMandates[0]?.id ?? null;
      });

      const activeMandates = fetchedMandates.filter((m) => m.status === "ACTIVE").length;
      const pendingApprovals = (approvalsResp.approvals ?? []).filter((a) => a.status === "PENDING").length;
      const autoApproved = (runsResp.runs ?? []).filter((r) => r.decision === "AUTO_APPROVE").length;
      const blocked = (runsResp.runs ?? []).filter((r) => r.decision === "BLOCK").length;
      const totalSpending = (runsResp.runs ?? []).reduce((sum, r) => sum + Number(r.total || 0), 0);

      setMetrics([
        { title: "Active Mandates", value: activeMandates },
        { title: "Purchase Requests", value: (runsResp.runs ?? []).length },
        { title: "Pending Approvals", value: pendingApprovals },
        { title: "Auto-Approved", value: autoApproved },
        { title: "Blocked Purchases", value: blocked },
        { title: "Total Governed Spending", value: `$${totalSpending.toFixed(2)}` }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  // Execute Agent Shopping Run (Two-Step Creation with Approval Link)
  const executeAgentRun = async (scenario?: "within" | "ask" | "over-cap", customTask?: string) => {
    if (!mandateId) {
      setRunnerError("Please select an active mandate first or create one.");
      return;
    }

    const currentMandate = mandates.find((m) => m.id === mandateId);
    if (currentMandate && currentMandate.status === "ACTIVE" && (currentMandate.totalSpent || 0) >= currentMandate.period.budget) {
      setRunnerError(`This mandate's monthly budget is fully spent ($${currentMandate.totalSpent?.toFixed(2)} / $${currentMandate.period.budget}). All purchases under it have already been completed. Please select another active mandate with available budget.`);
      return;
    }

    const taskToRun = customTask || taskPrompt || "A4 printer paper and medium roast coffee beans";
    setRunningRunner(true);
    setRunnerError(null);
    setRunnerStatusMessage("1/2 Dispatching AI Shopper Agent & evaluating policy engine...");

    try {
      // 1. Dispatch Run
      const runRes = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mandateId,
          task: taskToRun,
          scenario
        })
      });

      const runData = await readJson<{
        runId?: string;
        decision?: string;
        total?: number;
        cart?: { items: Array<{ productId?: string; title?: string; unitPrice: number; quantity: number }> };
        error?: string;
        ruleResults?: Array<{ id: string; passed: boolean; reason: string }>;
        reviewer?: { rationale?: string };
        ai?: { reviewerRationale?: string };
      }>(runRes);

      if (!runRes.ok || !runData.runId) {
        throw new Error(runData.error ?? "Failed to execute purchase run.");
      }

      const runId = runData.runId;
      const decision = runData.decision ?? "UNKNOWN";
      const total = Number(runData.total || 0);
      const items = runData.cart?.items ?? [];
      const reviewerRationale = runData.reviewer?.rationale || runData.ai?.reviewerRationale || null;

      let paypalOrderId: string | null = null;
      let paypalApprovalUrl: string | null = null;
      let paypalCaptureId: string | null = null;
      let paypalStatus: string | null = null;
      let ledgerSeq: number | null = null;

      // 2. If AUTO_APPROVE, create the PayPal Sandbox Order (AWAITING_PAYPAL_APPROVAL)
      // DO NOT call /capture immediately (prevent status 422)!
      if (decision === "AUTO_APPROVE") {
        setRunnerStatusMessage("2/2 Policy passed (AUTO_APPROVE). Created PayPal Sandbox Order. Ready for buyer approval...");
        const orderRes = await fetch("/api/paypal/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId })
        });
        const orderData = await readJson<{ orderId?: string; status?: string; approvalUrl?: string; error?: string }>(orderRes);
        if (!orderRes.ok || !orderData.orderId) {
          throw new Error(orderData.error ?? "PayPal order creation failed.");
        }
        paypalOrderId = orderData.orderId;
        paypalStatus = orderData.status ?? "AWAITING_PAYPAL_APPROVAL";
        paypalApprovalUrl = orderData.approvalUrl ?? null;
      } else if (decision === "ASK_HUMAN") {
        setRunnerStatusMessage("Purchase exceeds limits. Held for human review in Approval Inbox below.");
      } else if (decision === "BLOCK") {
        setRunnerStatusMessage("Purchase violates hard limits. Blocked by Policy Engine ($0 charged).");
      }

      setLastRunResult({
        runId,
        decision,
        total,
        items,
        paypalOrderId,
        paypalApprovalUrl,
        paypalCaptureId,
        paypalStatus,
        ledgerSequence: ledgerSeq,
        reviewerRationale,
        ruleResults: runData.ruleResults
      });

      // Refresh dashboard tables, metrics, and ledger
      await refreshDashboard();
    } catch (err) {
      setRunnerError(err instanceof Error ? err.message : "Run execution failed.");
    } finally {
      setRunningRunner(false);
      setRunnerStatusMessage(null);
    }
  };

  // Manual Capture Trigger (if user completed approval in a separate tab)
  const handleManualCapture = async (runId: string) => {
    setCapturingOrder(true);
    setRunnerError(null);
    try {
      const captureRes = await fetch("/api/paypal/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId })
      });
      const captureData = await readJson<{ captureId?: string; status?: string; ledgerSequence?: number; error?: string }>(captureRes);
      if (!captureRes.ok) {
        throw new Error(captureData.error ?? "Capture failed. Has the buyer approved the order on PayPal?");
      }
      setLastRunResult((current) => current ? {
        ...current,
        paypalCaptureId: captureData.captureId ?? null,
        paypalStatus: "PAID",
        ledgerSequence: captureData.ledgerSequence ?? null
      } : null);
      await refreshDashboard();
    } catch (err) {
      setRunnerError(err instanceof Error ? err.message : "Capture failed.");
    } finally {
      setCapturingOrder(false);
    }
  };

  // Wire Approval Actions
  const handleApprove = async (approvalId: string, runId: string) => {
    setProcessingApprovalId(approvalId);
    setApprovalMessage(null);
    try {
      // 1. Resolve approval in DB
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: approvalId,
          status: "APPROVED",
          reviewer: "human-approver"
        })
      });
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to approve request.");

      // 2. Create PayPal Sandbox Order for approved request (AWAITING_PAYPAL_APPROVAL)
      const orderRes = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId })
      });
      const orderData = await readJson<{ orderId?: string; status?: string; approvalUrl?: string; error?: string }>(orderRes);
      if (!orderRes.ok || !orderData.orderId) throw new Error(orderData.error ?? "Failed to create PayPal order.");

      setApprovalMessage({
        text: `✓ Request approved! PayPal Sandbox Order ${orderData.orderId} created (${orderData.status ?? "AWAITING_PAYPAL_APPROVAL"}).`,
        type: "success",
        approvalUrl: orderData.approvalUrl
      });
      await refreshDashboard();
    } catch (err) {
      setApprovalMessage({
        text: err instanceof Error ? `Error: ${err.message}` : "Failed to execute approval.",
        type: "error"
      });
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    setProcessingApprovalId(approvalId);
    setApprovalMessage(null);
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: approvalId,
          status: "REJECTED",
          reviewer: "human-approver"
        })
      });
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to reject request.");

      setApprovalMessage({
        text: "Purchase request was rejected. Payment blocked ($0 charged).",
        type: "success"
      });
      await refreshDashboard();
    } catch (err) {
      setApprovalMessage({
        text: err instanceof Error ? `Error: ${err.message}` : "Failed to reject approval.",
        type: "error"
      });
    } finally {
      setProcessingApprovalId(null);
    }
  };

  // Wire Ledger Verification
  const handleVerifyLedger = async () => {
    setVerifyingLedger(true);
    try {
      const url = mandateId ? `/api/ledger/verify?mandateId=${encodeURIComponent(mandateId)}` : "/api/ledger/verify";
      const res = await fetch(url);
      const data = await readJson<{ verification?: { valid: boolean }; entries?: LedgerGridRow[] }>(res);
      setLedgerValid(data.verification?.valid ?? false);
      if (data.entries) setLedgerEntries(data.entries);
    } catch {
      setLedgerValid(false);
    } finally {
      setVerifyingLedger(false);
    }
  };

  // Revoke/Archive Mandate Handler
  const [revokingMandateId, setRevokingMandateId] = useState<string | null>(null);
  const handleRevokeMandate = async (id: string) => {
    if (!window.confirm("Are you sure you want to archive/revoke this mandate? The AI Shopper will no longer make purchases under it.")) {
      return;
    }
    setRevokingMandateId(id);
    try {
      const res = await fetch(`/api/mandates/${id}/revoke`, { method: "POST" });
      if (!res.ok) {
        const err = await readJson<{ error?: string }>(res);
        throw new Error(err.error ?? "Failed to revoke mandate.");
      }
      await refreshDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke mandate.");
    } finally {
      setRevokingMandateId(null);
    }
  };

  const selectedMandate = mandates.find((m) => m.id === mandateId) || mandates[0] || null;

  if (loading && mandates.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="Control Room" subtitle="Your mandate-governed purchasing command center" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-surface animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && mandates.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="Control Room" subtitle="Your mandate-governed purchasing command center" />
        <div className="rounded-lg border border-error bg-error-bg p-6">
          <h3 className="text-sm font-semibold text-error">Unable to load dashboard</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button
            onClick={refreshDashboard}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface text-text-secondary px-3 py-1.5 text-xs font-medium hover:text-text-primary hover:bg-surface-focus focus-visible-outline cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title="Control Room"
        subtitle="Your mandate-governed purchasing command center"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}
        action={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={refreshDashboard} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/new">Create Mandate</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/redteam" className="text-red-300 hover:text-red-200">
                🛡️ Red-Team Lab
              </Link>
            </Button>
          </div>
        }
      />

      {/* Return & Capture Status Notification Banner */}
      {paypalBanner && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between text-xs font-medium shadow-md ${
            paypalBanner.type === "success"
              ? "border-success/40 bg-success/15 text-success"
              : "border-error/40 bg-error/15 text-error"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{paypalBanner.type === "success" ? "✓" : "✕"}</span>
            <span>{paypalBanner.message}</span>
          </div>
          <button
            onClick={() => setPaypalBanner(null)}
            className="text-text-muted hover:text-text-primary font-bold ml-3 cursor-pointer"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* System Status Badges */}
      <section className="content-section">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-text-secondary">Database Connected</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-text-secondary">PayPal Sandbox Live</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-text-secondary">AI Provider (NVIDIA NIM Nemotron)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface text-xs">
            <span className={`w-2 h-2 rounded-full ${ledgerValid ? "bg-success" : ledgerValid === false ? "bg-error" : "bg-warning"}`}></span>
            <span className="text-text-secondary">
              SHA-256 Ledger: {ledgerValid ? "Verified Intact" : ledgerValid === false ? "Tampered" : "Not Verified"}
            </span>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="content-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </section>

      {/* Interactive Agent Shopping Runner & Live PayPal Simulator */}
      <section id="agent-runner" className="content-section rounded-xl border border-primary/30 bg-surface-elevated/90 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">
                Agent Shopping Runner & Live PayPal Simulator
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Dispatch autonomous agent purchases governed by your active mandate. Creates orders in PayPal Sandbox, requests buyer authorization, captures settlement upon return, and chains SHA-256 ledger proofs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/redteam"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/40 hover:border-red-400 transition"
            >
              <span>🛡️ Test in Red-Team Lab</span>
            </Link>
          </div>
        </div>

        {/* Mandate Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Select Active Governing Mandate
            </label>
            {mandates.length === 0 ? (
              <div className="p-3 rounded-lg border border-warning/40 bg-warning/10 text-xs text-warning flex items-center justify-between">
                <span>No active mandates found. Create a mandate first to govern purchases.</span>
                <Link href="/new" className="font-semibold underline ml-2">Create Mandate →</Link>
              </div>
            ) : (
              <select
                aria-label="Select Governing Mandate"
                value={mandateId ?? ""}
                onChange={(e) => setMandateId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                {(() => {
                  const activeAvailable = mandates.filter((m) => m.status === "ACTIVE" && (m.totalSpent || 0) < m.period.budget);
                  const completedOrExhausted = mandates.filter((m) => m.status === "ACTIVE" && (m.totalSpent || 0) >= m.period.budget);
                  const revoked = mandates.filter((m) => m.status === "REVOKED");

                  const renderOption = (m: MandateRow, isCompleted = false) => {
                    const cleanTitle = cleanPurposeText(m.purpose);
                    const spent = m.totalSpent || 0;
                    const remaining = Math.max(0, m.period.budget - spent);
                    let statusLabel = "";
                    if (m.status === "REVOKED") {
                      statusLabel = "[ARCHIVED / REVOKED]";
                    } else if (isCompleted || spent >= m.period.budget) {
                      statusLabel = `[✓ COMPLETED & PAID — $${spent.toFixed(2)} / $${m.period.budget}]`;
                    } else if (spent > 0) {
                      statusLabel = `[Spent: $${spent.toFixed(2)} | Remaining: $${remaining.toFixed(2)}]`;
                    } else {
                      statusLabel = `[Budget: $${m.period.budget.toFixed(2)} Available]`;
                    }
                    const thresholdLabel = m.askAbove ? `(Ask >$${m.askAbove})` : "";
                    return (
                      <option key={m.id} value={m.id}>
                        {cleanTitle} — {statusLabel} {thresholdLabel}
                      </option>
                    );
                  };

                  return (
                    <>
                      {activeAvailable.length > 0 && (
                        <optgroup label="🟢 Active Mandates (Available Spending Budget)">
                          {activeAvailable.map((m) => renderOption(m, false))}
                        </optgroup>
                      )}
                      {completedOrExhausted.length > 0 && (
                        <optgroup label="✅ Completed / Budget Exhausted (Purchases Already Done)">
                          {completedOrExhausted.map((m) => renderOption(m, true))}
                        </optgroup>
                      )}
                      {revoked.length > 0 && (
                        <optgroup label="⛔ Archived / Revoked Mandates">
                          {revoked.map((m) => renderOption(m, false))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
            )}
          </div>

          {selectedMandate && (
            <div className="p-3.5 rounded-lg border border-border bg-surface space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Item Cap</p>
                  <p className="text-sm font-bold text-text-primary">${selectedMandate.caps.perItem ?? "∞"}</p>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Ask Threshold</p>
                  <p className="text-sm font-bold text-warning">{selectedMandate.askAbove ? `>$${selectedMandate.askAbove}` : "None"}</p>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Monthly Budget</p>
                  <p className="text-sm font-bold text-text-primary">${selectedMandate.period.budget}</p>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border/50">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Spent / Remaining</p>
                  <p className="text-sm font-bold text-success">
                    ${(selectedMandate.totalSpent || 0).toFixed(2)} / ${Math.max(0, selectedMandate.period.budget - (selectedMandate.totalSpent || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Purchase History / Completed Notification */}
              {(selectedMandate.totalSpent || 0) > 0 && (
                <div className="p-2 rounded-md border border-success/30 bg-success/10 text-xs text-success flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>✓</span>
                    <span>
                      {selectedMandate.runsCount || 1} purchase(s) already approved & completed under this mandate (
                      <strong>${selectedMandate.totalSpent?.toFixed(2)}</strong> paid via PayPal).
                    </span>
                  </span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-success/20 text-[10px]">
                    {(selectedMandate.totalSpent || 0) >= selectedMandate.period.budget ? "FULFILLED" : "ACTIVE"}
                  </span>
                </div>
              )}

              {/* Mandate Actions (Archive / Revoke) */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                <span className="text-text-muted font-mono text-[10px]">{selectedMandate.id}</span>
                {selectedMandate.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => handleRevokeMandate(selectedMandate.id)}
                    disabled={revokingMandateId === selectedMandate.id}
                    className="text-text-muted hover:text-error text-xs font-medium underline transition cursor-pointer"
                  >
                    {revokingMandateId === selectedMandate.id ? "Archiving..." : "Archive / Revoke Duplicate"}
                  </button>
                ) : (
                  <span className="text-error font-semibold text-xs">Archived / Revoked</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 1-Click Simulation Scenarios */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
            1-Click Test Scenarios (Instant Policy & PayPal Proof)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={runningRunner || !mandateId}
              onClick={() => executeAgentRun("within", "A4 printer paper and medium roast coffee beans")}
              className="p-3.5 rounded-lg border border-success/40 bg-success/10 hover:bg-success/20 transition text-left cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-success">🟢 Scenario 1: Within Limits ($33.49)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success font-semibold">Auto-Approve</span>
              </div>
              <p className="text-xs text-text-secondary">
                Paper ($18.99) + Coffee ($14.50). Evaluates all 13 rules, generates PayPal Sandbox Order, and provides one-click approval link!
              </p>
            </button>

            <button
              type="button"
              disabled={runningRunner || !mandateId}
              onClick={() => executeAgentRun("ask", "Paper and coffee with premium coffee bulk order above threshold")}
              className="p-3.5 rounded-lg border border-warning/40 bg-warning/10 hover:bg-warning/20 transition text-left cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-warning">🟡 Scenario 2: Above Threshold ($76.99)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-semibold">Ask Human</span>
              </div>
              <p className="text-xs text-text-secondary">
                Coffee x4 + Paper. Triggers Rule R07. Routes to Approval Inbox below for human review and PayPal checkout!
              </p>
            </button>

            <button
              type="button"
              disabled={runningRunner || !mandateId}
              onClick={() => executeAgentRun("over-cap", "Bulk designer furniture exceeding item cap")}
              className="p-3.5 rounded-lg border border-error/40 bg-error/10 hover:bg-error/20 transition text-left cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-error">🔴 Scenario 3: Hard Cap Violation ($300.00)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/20 text-error font-semibold">Block ($0)</span>
              </div>
              <p className="text-xs text-text-secondary">
                Violates Rule R04 per-item cap. Hard blocked by deterministic engine. <strong>$0.00 charged</strong>.
              </p>
            </button>
          </div>
        </div>

        {/* Custom Purchasing Intent Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Or Run Custom Purchasing Intent
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="Custom Purchasing Intent"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="e.g. Order 2 packs of A4 printer paper and medium roast coffee"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              disabled={runningRunner}
            />
            <Button
              variant="primary"
              size="md"
              disabled={runningRunner || !taskPrompt.trim() || !mandateId}
              onClick={() => executeAgentRun(undefined, taskPrompt)}
            >
              {runningRunner ? "Executing Purchase..." : "🚀 Run Agent Purchase"}
            </Button>
          </div>
        </div>

        {/* Runner Status / Error */}
        {runningRunner && runnerStatusMessage && (
          <div className="mt-4 p-3 rounded-lg border border-primary/40 bg-primary/10 text-xs text-primary flex items-center gap-2 animate-pulse">
            <span className="animate-spin text-sm">⏳</span>
            <span>{runnerStatusMessage}</span>
          </div>
        )}

        {runnerError && (
          <div className="mt-4 p-3 rounded-lg border border-error/40 bg-error/10 text-xs text-error">
            {runnerError}
          </div>
        )}

        {/* Last Run Live Result Console */}
        {lastRunResult && (
          <div className="mt-6 rounded-lg border border-border bg-surface p-5 space-y-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Live Run Result:</span>
                <span className="font-mono text-xs text-text-primary">{lastRunResult.runId}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={lastRunResult.decision as any} size="sm" />
                {lastRunResult.paypalStatus && (
                  <StatusBadge status={lastRunResult.paypalStatus as any} size="sm" />
                )}
              </div>
            </div>

            {/* Awaiting Buyer PayPal Approval State */}
            {lastRunResult.paypalOrderId && lastRunResult.paypalStatus === "AWAITING_PAYPAL_APPROVAL" && (
              <div className="p-4 rounded-lg border border-warning/40 bg-warning/10 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base text-warning">🟡</span>
                      <p className="text-sm font-bold text-text-primary">
                        PayPal Sandbox Order Created — Awaiting Buyer Approval
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      Order ID <strong className="font-mono text-text-primary">{lastRunResult.paypalOrderId}</strong> created in PayPal Sandbox.
                      Click the button below to authorize the sandbox purchase in PayPal. Upon return, the payment will be automatically captured and anchored to the ledger.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {lastRunResult.paypalApprovalUrl && (
                    <a
                      href={lastRunResult.paypalApprovalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs shadow-md transition"
                    >
                      <span>👉 Approve on PayPal Sandbox →</span>
                    </a>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleManualCapture(lastRunResult.runId)}
                    disabled={capturingOrder}
                  >
                    {capturingOrder ? "Capturing..." : "⚡ Capture After Approval"}
                  </Button>
                </div>
              </div>
            )}

            {/* Captured / Paid State */}
            {lastRunResult.paypalOrderId && (lastRunResult.paypalStatus === "PAID" || lastRunResult.paypalStatus === "COMPLETED") && (
              <div className="p-3.5 rounded-lg border border-success/40 bg-success/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base text-success font-bold">✓</span>
                  <p className="text-sm font-bold text-success">
                    PayPal Sandbox Payment Captured & Marked as PAID!
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted block text-[10px]">PayPal Order ID</span>
                    <span className="font-mono font-semibold text-text-primary">{lastRunResult.paypalOrderId}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">PayPal Capture ID</span>
                    <span className="font-mono font-semibold text-success">{lastRunResult.paypalCaptureId ?? "Captured"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Audit Ledger Sequence</span>
                    <span className="font-mono font-semibold text-text-primary">
                      {lastRunResult.ledgerSequence ? `Seq #${lastRunResult.ledgerSequence}` : "Anchored"}
                    </span>
                  </div>
                </div>
                <div className="pt-1 flex gap-3 text-xs">
                  <Link href="/orders" className="text-primary hover:underline font-medium">View in Orders →</Link>
                  <Link href="/payments" className="text-primary hover:underline font-medium">View in Payments →</Link>
                  <Link href="/ledger" className="text-primary hover:underline font-medium">Verify in SHA-256 Ledger →</Link>
                </div>
              </div>
            )}

            {lastRunResult.decision === "ASK_HUMAN" && (
              <div className="p-3.5 rounded-lg border border-warning/40 bg-warning/10 flex items-center justify-between text-xs text-warning">
                <div>
                  <span className="font-bold">⚠️ Purchase held for human review:</span> Approval request created.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("approval-inbox")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="font-bold underline cursor-pointer hover:text-warning-hover ml-2"
                >
                  Go to Approval Inbox Below ↓
                </button>
              </div>
            )}

            {lastRunResult.decision === "BLOCK" && (
              <div className="p-3.5 rounded-lg border border-error/40 bg-error/10 text-xs text-error">
                <strong>🛑 Hard Block Enforced:</strong> Purchase violates mandate safety rules. No funds transferred ($0.00 charged).
              </div>
            )}

            {/* Cart Items Summary */}
            {lastRunResult.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-border">
                  <thead className="bg-surface-elevated text-text-secondary border-b border-border">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Unit Price</th>
                      <th className="p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastRunResult.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-2 font-medium text-text-primary">{item.title ?? item.productId ?? "Cart Item"}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">${item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 font-semibold">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-surface-elevated font-bold text-text-primary">
                      <td colSpan={3} className="p-2 text-right">Total:</td>
                      <td className="p-2">${lastRunResult.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {lastRunResult.reviewerRationale && (
              <div className="text-xs text-text-secondary bg-surface-elevated p-3 rounded border border-border">
                <span className="font-semibold text-text-primary">Nemotron Reviewer Rationale:</span> {lastRunResult.reviewerRationale}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Active Mandates */}
      <section className="content-section">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Active Mandates</h2>
          <Link href="/mandates" className="text-sm text-primary hover:text-primary-hover focus-visible-outline">
            View all →
          </Link>
        </div>
        {mandates.length === 0 ? (
          <EmptyState
            title="No mandates yet"
            description="Create your first mandate to start governing AI purchases."
            action={<Button variant="primary" size="sm" asChild><Link href="/new">Create Mandate</Link></Button>}
          />
        ) : (
          <DataTable
            columns={[
              { key: "purpose", header: "Purpose", width: "40%" },
              { key: "status", header: "Status", width: "20%" },
              { key: "budget", header: "Monthly Budget", width: "20%" },
              { key: "perItem", header: "Per-Item Cap", width: "20%" }
            ]}
            data={mandates}
            renderCell={(item, key) => {
              if (key === "status") return <StatusBadge status={item.status as any} />;
              if (key === "budget") return `$${item.period.budget.toFixed(2)}`;
              if (key === "perItem") return item.caps.perItem !== null ? `$${item.caps.perItem}` : "—";
              return item.purpose;
            }}
            rowKey={(item) => item.id}
          />
        )}
      </section>

      {/* Recent Purchase Activity */}
      <section className="content-section">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Purchase Activity</h2>
          <Link href="/purchase-requests" className="text-sm text-primary hover:text-primary-hover focus-visible-outline">
            View all →
          </Link>
        </div>
        {runs.length === 0 ? (
          <EmptyState
            title="No purchase requests yet"
            description="Dispatch an autonomous purchase run using the simulator above."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => document.getElementById("agent-runner")?.scrollIntoView({ behavior: "smooth" })}
              >
                Run First Agent Purchase
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={[
              { key: "run_id", header: "Run ID", width: "25%" },
              { key: "decision", header: "Decision", width: "20%" },
              { key: "total", header: "Total", width: "15%" },
              { key: "created_at", header: "Created", width: "40%" }
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
      </section>

      {/* Approval Inbox with Live PayPal Execution */}
      <section id="approval-inbox" className="content-section">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Approval Inbox</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Review held purchase requests. Approving creates a PayPal Sandbox order awaiting buyer authorization.
            </p>
          </div>
          <Link href="/approvals" className="text-sm text-primary hover:text-primary-hover focus-visible-outline">
            View all →
          </Link>
        </div>

        {approvalMessage && (
          <div
            className={`mb-4 p-4 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
              approvalMessage.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-error/40 bg-error/10 text-error"
            }`}
          >
            <span>{approvalMessage.text}</span>
            {approvalMessage.approvalUrl && (
              <a
                href={approvalMessage.approvalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-primary-text font-bold text-xs shadow transition whitespace-nowrap"
              >
                👉 Approve on PayPal Sandbox →
              </a>
            )}
          </div>
        )}

        {(() => {
          const pending = approvals.filter((a) => a.status === "PENDING");
          if (pending.length === 0) {
            return (
              <EmptyState
                title="No pending approvals"
                description="All purchase requests have been reviewed."
              />
            );
          }
          return (
            <div className="space-y-3">
              {pending.map((approval) => (
                <div key={approval.id} className="rounded-lg border border-border bg-surface-elevated p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-text-primary">{approval.run_id}</span>
                    <StatusBadge status={approval.status as any} size="sm" />
                  </div>
                  <p className="text-sm text-text-secondary">{approval.reason ?? "Awaiting human review."}</p>
                  {approval.total !== undefined && (
                    <p className="text-sm font-semibold text-text-primary mt-1">Total: ${Number(approval.total).toFixed(2)}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      disabled={processingApprovalId === approval.id}
                      onClick={() => handleApprove(approval.id, approval.run_id)}
                    >
                      {processingApprovalId === approval.id ? "Creating Order..." : "✓ Approve & Create PayPal Order"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={processingApprovalId === approval.id}
                      onClick={() => handleReject(approval.id)}
                    >
                      {processingApprovalId === approval.id ? "Rejecting..." : "✕ Reject"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Audit Ledger Preview */}
      <section className="content-section">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Audit Ledger</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Cryptographically chained SHA-256 tamper-evident record of all purchase events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${ledgerValid ? "text-success" : ledgerValid === false ? "text-error" : "text-text-muted"}`}>
              {ledgerValid === true ? "Valid — Verified" : ledgerValid === false ? "Tampered — Invalid" : "Not Verified"}
            </span>
            <Button variant="secondary" size="sm" onClick={handleVerifyLedger} disabled={verifyingLedger}>
              {verifyingLedger ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
        <LedgerGrid
          rows={ledgerEntries}
          valid={ledgerValid}
          onVerify={handleVerifyLedger}
          mandateId={mandateId ?? undefined}
        />
      </section>

      {/* Quick Navigation Actions */}
      <section className="content-section">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="primary" size="md" asChild>
            <Link href="/new">Create Mandate</Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/approvals">Review Approvals</Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/ledger">Open Ledger</Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/redteam" className="text-red-300 hover:text-red-200">
              🛡️ Red-Team Lab
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
