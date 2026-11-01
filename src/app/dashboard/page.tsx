"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LedgerGrid, { type LedgerGridRow } from "./LedgerGrid";

type RuleResult = {
  id: string;
  passed: boolean;
  reason: string;
};

type RunResult = {
  runId: string;
  decision: "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK";
  total: number;
  cart: {
    items: Array<{
      title: string;
      merchant: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
  flags: Array<{ code: string; quote: string }>;
  ruleResults: RuleResult[];
  catalogSource?: "real" | "fixture";
  catalogNotice?: string;
  tracking?: { carrier?: string; trackingNumber?: string; status?: string; simulated?: boolean };
  ai?: {
    source?: string;
    reasoning?: string;
    shopper?: { model?: string; latencyMs?: number };
    reviewer?: { model?: string; latencyMs?: number };
    reviewerRationale?: string;
  };
  reviewer?: { rationale: string; riskFlags: Array<{ code: string }>; source: string } | null;
  error?: string;
};

type Approval = {
  id: string;
  run_id: string;
  status: string;
  reviewer?: string;
  reason?: string;
  expires_at?: string;
  total?: number;
  policy?: { ruleResults?: RuleResult[] };
};

type LedgerRow = {
  sequence: number;
  timestamp: string;
  type: string;
  entryHash: string;
  runId?: string;
  decision?: string;
  rationale?: string;
  ruleResults?: RuleResult[];
};

const decisionColor = {
  AUTO_APPROVE: "#6ee7b7",
  ASK_HUMAN: "#f0c674",
  BLOCK: "#ff7b8b"
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

export default function DashboardPage() {
  const [owner, setOwner] = useState("");
  const [mandateOwner, setMandateOwner] = useState("");
  const [task, setTask] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [approvedOrderId, setApprovedOrderId] = useState<string | null>(null);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [mandateStatus, setMandateStatus] = useState("No mandate confirmed");
  const [approvedRunId, setApprovedRunId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerValid, setLedgerValid] = useState<boolean | null>(null);
  const [scenario, setScenario] = useState<"within" | "ask" | "over-cap" | "hostile">("within");
  const [demoStatus, setDemoStatus] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mcpKey, setMcpKey] = useState<string | null>(null);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);
  const [disputeDraft, setDisputeDraft] = useState<{ summary: string; source: string } | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refreshControlRoom = useCallback(async () => {
    const currentMandateId = mandateId ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mandateId") : null);
    const [approvalResponse, ledgerResponse] = await Promise.all([
      fetch("/api/approvals"),
      currentMandateId
        ? fetch(`/api/ledger/verify?mandateId=${encodeURIComponent(currentMandateId)}`)
        : Promise.resolve(new Response(null, { status: 204 }))
    ]);
    if (approvalResponse.ok) {
      const body = await readJson<{ approvals?: Approval[] }>(approvalResponse);
      setApprovals(body.approvals ?? []);
    }
    if (ledgerResponse.ok) {
      const body = await readJson<{ entries?: LedgerRow[]; verification?: { valid: boolean } }>(ledgerResponse);
      if (body.entries && body.verification) {
        setLedger(body.entries);
        setLedgerValid(body.verification.valid);
      }
    }
  }, [mandateId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedMandateId = params.get("mandateId");
    if (returnedMandateId) setMandateId(returnedMandateId);
    if (params.get("paypal") === "approved") {
      setApprovedOrderId(params.get("orderId"));
      setApprovedRunId(params.get("runId"));
      setCaptureStatus("Buyer approval received. Capture the order to complete payment.");
    }
    void refreshControlRoom();
  }, [refreshControlRoom]);

  useEffect(() => {
    if (!mandateId) return;
    void (async () => {
      const response = await fetch(`/api/mandates/${encodeURIComponent(mandateId)}`);
      if (!response.ok) return;
      const body = await response.json() as { mandate?: { owner: string; purpose: string; status: string } };
      if (!body.mandate) return;
      setOwner(body.mandate.owner);
      setMandateOwner(body.mandate.owner);
      setTask(body.mandate.purpose);
      setMandateStatus(`Mandate ${body.mandate.status} — ready for governed runs.`);
    })();
  }, [mandateId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function verifyLedgerNow() {
    if (!mandateId) return;
    const response = await fetch(`/api/ledger/verify?mandateId=${encodeURIComponent(mandateId)}`);
    if (response.ok) {
      const body = await readJson<{ entries?: LedgerRow[]; verification?: { valid: boolean } }>(response);
      if (body.entries && body.verification) {
        setLedger(body.entries);
        setLedgerValid(body.verification.valid);
      }
    }
  }

  async function seedDemo() {
    setActionLoading("demo");
    setDemoStatus("Seeding sandbox buyer, active mandate, and sample runs...");
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: owner || "judge@example.com" })
      });
      const body = await readJson<{ mandate?: { id: string; owner: string; purpose: string }; error?: string }>(response);
      if (!response.ok || !body.mandate) {
        setDemoStatus(body.error ?? "Demo seed failed.");
        return;
      }
      setOwner(body.mandate.owner);
      setMandateOwner(body.mandate.owner);
      setTask(body.mandate.purpose);
      setMandateId(body.mandate.id);
      setMandateStatus("Mandate ACTIVE — demo data ready.");
      setDemoStatus("Demo login ready. Sample runs and approval inbox loaded.");
      const ledgerResponse = await fetch(`/api/ledger/verify?mandateId=${encodeURIComponent(body.mandate.id)}`);
      if (ledgerResponse.ok) {
        const ledgerBody = await readJson<{ entries?: LedgerRow[]; verification?: { valid: boolean } }>(ledgerResponse);
        if (ledgerBody.entries && ledgerBody.verification) {
          setLedger(ledgerBody.entries);
          setLedgerValid(ledgerBody.verification.valid);
        }
      }
      await refreshControlRoom();
    } catch (error) {
      setDemoStatus(error instanceof Error ? error.message : "Demo seed failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function resolveApproval(id: string, status: "APPROVED" | "REJECTED") {
    setActionLoading(`approval-${id}`);
    try {
      const response = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, reviewer: owner || "judge@example.com" })
      });
      const responseBody = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(responseBody.error ?? "Could not resolve approval.");
      if (status === "APPROVED") {
        const approval = approvals.find((item) => item.id === id);
        if (approval) {
          setOrderStatus("Approval recorded. Creating a gated PayPal order...");
          const orderResponse = await fetch("/api/paypal/orders", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ runId: approval.run_id })
          });
          const order = await readJson<{ approvalUrl?: string; error?: string }>(orderResponse);
          if (!orderResponse.ok) throw new Error(order.error ?? "Could not create the gated order.");
          setApprovalUrl(order.approvalUrl ?? null);
          setOrderStatus("PayPal Sandbox order created. Buyer approval is required before capture.");
          if (order.approvalUrl) window.open(order.approvalUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        setOrderStatus("Approval rejected. No PayPal order was created.");
      }
      await refreshControlRoom();
    } catch (error) {
      setOrderStatus(error instanceof Error ? error.message : "Approval action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function createMcpKey() {
    if (!mandateId) return;
    setActionLoading("mcp");
    try {
      const response = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mandateId })
      });
      const body = await readJson<{ key?: string; error?: string }>(response);
      if (!response.ok) throw new Error(body.error ?? "Could not create MCP key.");
      setMcpKey(body.key ?? null);
    } catch (error) {
      setMcpKey(error instanceof Error ? error.message : "Could not create MCP key.");
    } finally {
      setActionLoading(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let activeMandateId = mandateId;
      if (!activeMandateId || (owner && mandateOwner && owner.trim().toLowerCase() !== mandateOwner.trim().toLowerCase())) {
        const defaultOwner = owner || "judge@example.com";
        const defaultTask = task || "Buy paper and coffee for the studio; max $120 a month; nothing over $40; ask me above $60.";
        const draftResponse = await fetch("/api/mandates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner: defaultOwner, intent: defaultTask })
        });
        const draft = await readJson<{ mandate?: { id: string; owner: string; purpose: string }; error?: string }>(draftResponse);
        if (!draftResponse.ok || !draft.mandate) throw new Error(draft.error ?? "Could not create mandate draft.");
        const confirmResponse = await fetch(`/api/mandates/${draft.mandate.id}/confirm`, { method: "POST" });
        const confirmed = await readJson<{ mandate?: { id: string; owner: string; purpose: string }; error?: string }>(confirmResponse);
        if (!confirmResponse.ok || !confirmed.mandate) throw new Error(confirmed.error ?? "Could not confirm mandate.");
        activeMandateId = confirmed.mandate.id;
        setOwner(confirmed.mandate.owner);
        setMandateOwner(confirmed.mandate.owner);
        setTask(confirmed.mandate.purpose);
        setMandateId(activeMandateId);
        setMandateStatus("Mandate ACTIVE");
      }
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mandateId: activeMandateId,
          task: task || "A4 printer paper and office supplies",
          scenario
        })
      });
      const body = await readJson<RunResult>(response);
      setResult(response.ok ? body : { ...body, error: body.error ?? "Run failed." });
      if (response.ok) await refreshControlRoom();
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Could not reach the Steward API." } as RunResult);
    } finally {
      setLoading(false);
    }
  }

  async function checkPayPal() {
    setActionLoading("paypal-health");
    setPaypalStatus("Checking PayPal Sandbox...");
    try {
      const response = await fetch("/api/paypal/health");
      const body = await readJson<{ connected?: boolean; error?: string }>(response);
      setPaypalStatus(body.connected ? "PayPal Sandbox connected." : body.error ?? "PayPal connection failed.");
    } catch (error) {
      setPaypalStatus(error instanceof Error ? error.message : "PayPal connection failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function createPayPalOrder() {
    if (!result || result.decision === "BLOCK" || result.total <= 0) return;
    setActionLoading("create-order");
    setOrderStatus("Creating PayPal Sandbox order...");
    try {
      const response = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: result.runId })
      });
      const body = await readJson<{ approvalUrl?: string; orderId?: string; error?: string }>(response);
      if (!response.ok) throw new Error(body.error ?? "Could not create PayPal order.");
      setApprovalUrl(body.approvalUrl ?? null);
      setOrderStatus(`Order ${body.orderId} created. ${body.approvalUrl ? "Open the approval link to continue." : ""}`);
      if (body.approvalUrl) window.open(body.approvalUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setOrderStatus(error instanceof Error ? error.message : "Could not create PayPal order.");
    } finally {
      setActionLoading(null);
    }
  }

  async function capturePayPalOrder() {
    if (!approvedOrderId) return;
    setActionLoading("capture");
    setCaptureStatus("Capturing PayPal Sandbox order...");
    try {
      const response = await fetch("/api/paypal/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: approvedRunId ?? result?.runId })
      });
      const body = await readJson<{ status?: string; ledgerSequence?: number; error?: string; tracking?: { carrier?: string; trackingNumber?: string; status?: string; simulated?: boolean } }>(response);
      if (!response.ok) throw new Error(body.error ?? "Payment capture failed.");
      if (body.tracking) setResult((current) => current ? { ...current, tracking: body.tracking } : current);
      setCaptureStatus(`Payment ${body.status}. Ledger entry #${body.ledgerSequence ?? "recorded"} appended to audit trail.`);
      await refreshControlRoom();
    } catch (error) {
      setCaptureStatus(error instanceof Error ? error.message : "Payment capture failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function refundPayment() {
    if (!result) return;
    setActionLoading("refund");
    setRefundStatus("Issuing Sandbox refund via PayPal API...");
    try {
      const response = await fetch("/api/paypal/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: result.runId })
      });
      const body = await readJson<{ refundId?: string; error?: string }>(response);
      setRefundStatus(response.ok ? `Refund issued: ${body.refundId}` : body.error ?? "Refund failed.");
      if (response.ok) await refreshControlRoom();
    } catch (error) {
      setRefundStatus(error instanceof Error ? error.message : "Refund failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function draftDispute() {
    if (!result) return;
    setActionLoading("dispute");
    try {
      const response = await fetch("/api/disputes/advocate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: result.runId })
      });
      const body = await readJson<{ draft?: { summary: string; source: string }; error?: string }>(response);
      setDisputeDraft(response.ok ? body.draft ?? null : { summary: body.error ?? "Dispute draft failed.", source: "fallback" });
    } catch (error) {
      setDisputeDraft({ summary: error instanceof Error ? error.message : "Dispute draft failed.", source: "fallback" });
    } finally {
      setActionLoading(null);
    }
  }

  async function replayDispute() {
    setActionLoading("dispute-simulation");
    setSimulationStatus("Replaying SIMULATED dispute webhook...");
    try {
      const response = await fetch("/api/paypal/webhook/replay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: result?.runId })
      });
      const body = await readJson<{ accepted?: boolean; error?: string }>(response);
      setSimulationStatus(response.ok ? "SIMULATED dispute webhook accepted and recorded to ledger." : body.error ?? "Simulation failed.");
      if (response.ok) await refreshControlRoom();
    } catch (error) {
      setSimulationStatus(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function revokeMandate() {
    if (!mandateId) return;
    setActionLoading("revoke");
    try {
      const response = await fetch(`/api/mandates/${mandateId}/revoke`, { method: "POST" });
      const body = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(body.error ?? "Could not revoke mandate.");
      setMandateStatus("Mandate REVOKED — all future payments blocked.");
    } catch (error) {
      setMandateStatus(error instanceof Error ? error.message : "Could not revoke mandate.");
    } finally {
      setActionLoading(null);
    }
  }

  async function startFreshSession() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/new";
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <Link href="/" style={{ color: "#8b9cff" }}>&larr; Back to Steward</Link>
      <h1 style={{ marginTop: "1rem" }}>Steward Control Room</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Autonomous procurement governed by explicit mandates. AI proposes items; deterministic policy enforces limits; immutable ledger audits every state transition.
      </p>

      {/* 8-Step Judge Journey Guide */}
      <details style={{ background: "#13192f", border: "1px solid #293252", borderRadius: 8, padding: "1rem", marginTop: "1.2rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, color: "#8b9cff" }}>
          How to evaluate this demo (8-step judge journey)
        </summary>
        <ol style={{ lineHeight: 1.8, marginTop: ".75rem", paddingLeft: "1.2rem", color: "#b8c0d9" }}>
          <li><b>Demo login:</b> Click <code style={{ color: "#6ee7b7" }}>Demo login — seed working data</code> to initialize an active mandate and sample runs.</li>
          <li><b>Verify PayPal Sandbox:</b> Click <code style={{ color: "#6ee7b7" }}>Check PayPal Sandbox</code> to confirm live PayPal API connectivity.</li>
          <li><b>Evaluate Scenarios:</b> Select <i>Within limits</i> (AUTO_APPROVE), <i>Above ask threshold</i> (ASK_HUMAN), <i>Over cap</i> (BLOCK), or <i>Hostile product</i> (BLOCK), then click <code style={{ color: "#6ee7b7" }}>Run Steward</code>.</li>
          <li><b>Approval Inbox:</b> For <i>ASK_HUMAN</i> decisions, view the pending request in the Approval inbox and click <b>Approve</b> or <b>Reject</b>.</li>
          <li><b>PayPal Checkout & Capture:</b> For approved runs, click <code style={{ color: "#6ee7b7" }}>Create PayPal Sandbox Order</code>, approve in PayPal Sandbox popup/tab, then click <code style={{ color: "#6ee7b7" }}>Capture approved payment</code> on return.</li>
          <li><b>Live Sandbox Refund:</b> Click <code style={{ color: "#6ee7b7" }}>Refund captured payment</code> to trigger a live refund against the captured PayPal transaction.</li>
          <li><b>Dispute Advocate & Simulation:</b> Click <code style={{ color: "#6ee7b7" }}>Draft dispute evidence</code> to generate factual evidence (A4 prompt) or <code style={{ color: "#6ee7b7" }}>Simulate dispute (development only)</code> to test dispute webhook handling.</li>
          <li><b>Ledger Verification & MCP:</b> Verify the SHA-256 hash chain with the <code style={{ color: "#6ee7b7" }}>Verify</code> button in Ledger Grid, or generate an MCP API key to test external tool governance.</li>
        </ol>
      </details>

      {/* Quick Setup Actions */}
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={seedDemo}
          disabled={actionLoading === "demo"}
          title="Seed sandbox buyer, active mandate, and sample runs"
          style={{ padding: ".7rem 1.1rem", background: "#8b9cff", color: "#08111f", fontWeight: 700, borderRadius: 6, cursor: actionLoading === "demo" ? "not-allowed" : "pointer" }}
        >
          {actionLoading === "demo" ? "Seeding demo..." : "Demo login — seed working data"}
        </button>
        <button
          type="button"
          onClick={checkPayPal}
          disabled={actionLoading === "paypal-health"}
          title="Check whether PayPal Sandbox credentials are configured and reachable"
          style={{ padding: ".7rem 1rem", borderRadius: 6, cursor: "pointer" }}
        >
          {actionLoading === "paypal-health" ? "Checking PayPal..." : "Check PayPal Sandbox"}
        </button>
        <button
          type="button"
          onClick={startFreshSession}
          title="Clear the current owner session and start a new mandate from scratch"
          style={{ padding: ".7rem 1rem", borderRadius: 6, cursor: "pointer" }}
        >
          Start fresh owner session
        </button>
        <button
          type="button"
          onClick={revokeMandate}
          disabled={!mandateId || actionLoading === "revoke"}
          title={mandateId ? "Permanently block all future payments for this mandate" : "Select or create a mandate first"}
          style={{ padding: ".7rem 1rem", borderRadius: 6, cursor: !mandateId ? "not-allowed" : "pointer", color: mandateId ? "#ff7b8b" : "#666" }}
        >
          {actionLoading === "revoke" ? "Revoking..." : "Kill switch: revoke mandate"}
        </button>
      </div>
      <small style={{ display: "block", color: "#8b9cff", marginTop: ".4rem" }}>
        Demo actions: seed sandbox buyer, check PayPal OAuth, or invoke the emergency revocation kill switch.
      </small>

      {demoStatus && <p role="status" style={{ color: "#6ee7b7", marginTop: ".5rem" }}>{demoStatus}</p>}
      {paypalStatus && <p role="status" style={{ color: "#8b9cff", marginTop: ".5rem" }}>{paypalStatus}</p>}

      {!mandateId && (
        <div role="status" style={{ padding: ".8rem 1rem", background: "#1c2438", border: "1px dashed #8b9cff", borderRadius: 6, color: "#8b9cff", marginTop: "1rem" }}>
          <strong>No active mandate loaded.</strong> Click <strong>Demo login — seed working data</strong> above to start with sample data, or click <Link href="/new" style={{ color: "#6ee7b7", textDecoration: "underline" }}>Create a mandate</Link>.
        </div>
      )}

      {/* Mandate Status Display */}
      <p role="status" style={{ marginTop: "1rem", color: mandateStatus.includes("ACTIVE") ? "#6ee7b7" : mandateStatus.includes("REVOKED") ? "#ff7b8b" : "#f0c674" }}>
        <strong>Status:</strong> {mandateStatus}
      </p>

      {/* Main Form for Governed Run */}
      <section style={{ marginTop: "2rem", border: "1px solid #293252", borderRadius: 10, padding: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Run Governed Purchase</h2>
        <p style={{ color: "#b8c0d9", marginTop: 0 }}>
          AI proposes cart items from Channel3/fixtures; deterministic policy evaluates limits; decision is recorded before payment.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: "1rem", maxWidth: 760 }}>
          <label>
            Owner email
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="judge@example.com"
              type="email"
              style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }}
            />
            <small style={{ color: "#8b9cff" }}>Mandate owner email used for authorization and sessions.</small>
          </label>
          <label>
            Purchase task
            <input
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="A4 printer paper and coffee beans"
              style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }}
            />
            <small style={{ color: "#8b9cff" }}>Item description to discover and purchase.</small>
          </label>
          <label>
            Scenario
            <select
              value={scenario}
              onChange={(event) => setScenario(event.target.value as typeof scenario)}
              style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }}
            >
              <option value="within">Within limits (AUTO_APPROVE)</option>
              <option value="ask">Above ask threshold (ASK_HUMAN)</option>
              <option value="over-cap">Over cap (BLOCK)</option>
              <option value="hostile">Hostile product (BLOCK)</option>
            </select>
            <small style={{ color: "#8b9cff" }}>Test deterministic policy behavior across safe, high-value, cap-exceeding, and adversarial inputs.</small>
          </label>
          <button
            type="submit"
            disabled={loading}
            title={loading ? "Waiting for policy evaluation" : "Ask the agent to propose a cart and run all policy checks"}
            style={{ width: "fit-content", padding: ".75rem 1.4rem", background: "#6ee7b7", color: "#08111f", fontWeight: 700, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Evaluating Policy..." : "Run Steward"}
          </button>
        </form>
      </section>

      {/* MCP Tools Section */}
      <section aria-label="MCP tools" style={{ marginTop: "2rem", border: "1px solid #293252", borderRadius: 8, padding: "1.2rem", maxWidth: 760 }}>
        <h2 style={{ marginTop: 0 }}>MCP Tools (Model Context Protocol)</h2>
        <p style={{ color: "#b8c0d9", marginTop: 0 }}>
          External agents can govern autonomous purchasing via mandate-scoped MCP keys.
        </p>
        <button
          type="button"
          onClick={createMcpKey}
          disabled={!mandateId || actionLoading === "mcp"}
          title={mandateId ? "Create a mandate-scoped key; it is shown once" : "Run or seed a mandate first"}
          style={{ padding: ".6rem 1rem", borderRadius: 6, cursor: !mandateId ? "not-allowed" : "pointer" }}
        >
          {actionLoading === "mcp" ? "Creating key..." : "Create mandate MCP key"}
        </button>
        <small style={{ display: "block", color: "#8b9cff", marginTop: ".4rem" }}>
          Generates an SHA-256 hashed API key authorized only for this mandate.
        </small>
        {mcpKey && (
          <p role="status" style={{ marginTop: ".8rem", padding: ".6rem", background: "#1c2438", borderRadius: 4 }}>
            Copy this key now; it is shown once: <code>{mcpKey}</code>
          </p>
        )}
        <p style={{ color: "#b8c0d9", marginTop: "1rem" }}>Available mandate tools at <code>/api/mcp</code>:</p>
        <ul style={{ color: "#8b9cff" }}>
          <li><code>propose_purchase</code> — propose cart items governed by mandate limits</li>
          <li><code>get_mandate_status</code> — check remaining budget and caps</li>
          <li><code>list_my_purchases</code> — inspect previous orders</li>
          <li><code>request_approval_status</code> — check human review outcomes</li>
        </ul>
      </section>

      {/* Approved Order Return Section */}
      {approvedOrderId && (
        <section style={{ marginTop: "2rem", border: "2px solid #6ee7b7", borderRadius: 10, padding: "1.2rem", background: "#0e1e24" }}>
          <strong style={{ color: "#6ee7b7", fontSize: "1.1rem" }}>Buyer approval received from PayPal Sandbox</strong>
          <p>Order ID: <code>{approvedOrderId}</code></p>
          <button
            type="button"
            onClick={capturePayPalOrder}
            disabled={actionLoading === "capture"}
            title="Capture only the PayPal order approved by the buyer"
            style={{ padding: ".7rem 1.2rem", background: "#6ee7b7", color: "#08111f", fontWeight: 700, borderRadius: 6, cursor: actionLoading === "capture" ? "not-allowed" : "pointer" }}
          >
            {actionLoading === "capture" ? "Capturing payment..." : "Capture approved payment"}
          </button>
          <small style={{ display: "block", color: "#8b9cff", marginTop: ".4rem" }}>
            Executes settlement against the authorized PayPal Sandbox order and appends ORDER_CAPTURED to the ledger.
          </small>
          {captureStatus && <p role="status" style={{ color: "#6ee7b7", marginTop: ".6rem" }}>{captureStatus}</p>}
        </section>
      )}

      {/* Run Outcome Section */}
      {result && (
        <section aria-live="polite" style={{ marginTop: "2.5rem" }}>
          {result.error ? (
            <div role="alert" style={{ border: "1px solid #ff7b8b", borderRadius: 8, padding: "1rem", color: "#ff7b8b", background: "#2a151b" }}>
              <strong>Run Error:</strong> {result.error}
            </div>
          ) : (
            <>
              <div style={{ border: "1px solid #293252", borderRadius: 10, padding: "1.2rem", background: "#13192f" }}>
                <p style={{ margin: 0, color: "#8b9cff", fontSize: ".9rem" }}>Run {result.runId}</p>
                <h2 style={{ color: decisionColor[result.decision], margin: ".3rem 0" }}>
                  {result.decision.replace("_", " ")}
                </h2>
                <p style={{ margin: ".3rem 0" }}>Total proposed: <strong>${result.total.toFixed(2)}</strong></p>
                <p style={{ margin: ".3rem 0" }}>
                  Catalog source: <strong>{result.catalogSource ?? "fixture"}</strong>
                  {result.catalogSource !== "real" && " (fixture fallback)"}
                </p>
                {result.catalogNotice && <p role="status" style={{ color: "#f0c674" }}>{result.catalogNotice}</p>}

                {result.ai && (
                  <div style={{ color: "#b8c0d9", marginTop: ".8rem", padding: ".8rem", background: "#0b1020", borderRadius: 6 }}>
                    <p style={{ margin: 0 }}>{result.ai.shopper?.model ? `Parsed by ${result.ai.shopper.model}` : "Parsed by deterministic fallback"}</p>
                    {result.ai.source === "fallback" && <strong style={{ color: "#f0c674" }}>AI fallback used</strong>}
                    {result.ai.reasoning && <p style={{ margin: ".4rem 0 0" }}><strong>Agent reasoning:</strong> {result.ai.reasoning}</p>}
                    {result.reviewer?.rationale && <p style={{ margin: ".4rem 0 0" }}><strong>Reviewer rationale:</strong> {result.reviewer.rationale}</p>}
                  </div>
                )}

                {/* Gated PayPal Order Creation */}
                {result.decision !== "BLOCK" && (
                  <div style={{ marginTop: "1rem" }}>
                    <button
                      type="button"
                      onClick={createPayPalOrder}
                      disabled={actionLoading === "create-order"}
                      title="Create an order only when the stored decision allows payment"
                      style={{ padding: ".7rem 1.2rem", background: "#8b9cff", color: "#08111f", fontWeight: 700, borderRadius: 6, cursor: actionLoading === "create-order" ? "not-allowed" : "pointer" }}
                    >
                      {actionLoading === "create-order" ? "Creating order..." : "Create PayPal Sandbox Order"}
                    </button>
                    {approvalUrl && (
                      <a
                        href={approvalUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-block", marginLeft: ".75rem", padding: ".7rem 1.2rem", color: "#08111f", background: "#6ee7b7", borderRadius: 6, fontWeight: 700, textDecoration: "none" }}
                      >
                        Approve in PayPal Sandbox &rarr;
                      </a>
                    )}
                    <small style={{ display: "block", color: "#8b9cff", marginTop: ".4rem" }}>
                      Gated by policy: creates order via PayPal Orders API v2 only after policy passes.
                    </small>
                  </div>
                )}

                {/* Fulfillment and Shipment Tracking */}
                {result.tracking && (
                  <p style={{ marginTop: "1rem", color: "#6ee7b7" }}>
                    <strong>Shipment:</strong> {result.tracking.status} — {result.tracking.carrier} / {result.tracking.trackingNumber} (simulated carrier)
                  </p>
                )}

                {/* Post-Purchase Actions: Refund, Dispute, Simulate */}
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
                  <button
                    type="button"
                    onClick={refundPayment}
                    disabled={actionLoading === "refund"}
                    title="Issue a Sandbox refund for the captured order via PayPal API"
                    style={{ padding: ".6rem 1rem", borderRadius: 6, cursor: actionLoading === "refund" ? "not-allowed" : "pointer" }}
                  >
                    {actionLoading === "refund" ? "Refunding..." : "Refund captured payment"}
                  </button>
                  <button
                    type="button"
                    onClick={draftDispute}
                    disabled={actionLoading === "dispute"}
                    title="Draft evidence using ledger facts; unknown facts stay unavailable"
                    style={{ padding: ".6rem 1rem", borderRadius: 6, cursor: actionLoading === "dispute" ? "not-allowed" : "pointer" }}
                  >
                    {actionLoading === "dispute" ? "Drafting..." : "Draft dispute evidence"}
                  </button>
                  <button
                    type="button"
                    onClick={replayDispute}
                    disabled={actionLoading === "dispute-simulation"}
                    title="Development-only local replay; not a live PayPal dispute"
                    style={{ padding: ".6rem 1rem", borderRadius: 6, cursor: actionLoading === "dispute-simulation" ? "not-allowed" : "pointer" }}
                  >
                    {actionLoading === "dispute-simulation" ? "Simulating..." : "Simulate dispute (development only)"}
                  </button>
                </div>
                <small style={{ display: "block", color: "#8b9cff", marginTop: ".4rem" }}>
                  Post-settlement actions: live refund in PayPal Sandbox, AI dispute packet generator, or webhook replay simulation.
                </small>

                {refundStatus && <p role="status" style={{ color: "#6ee7b7", marginTop: ".5rem" }}>{refundStatus}</p>}
                {simulationStatus && <p role="status" style={{ color: "#6ee7b7", marginTop: ".5rem" }}>{simulationStatus}</p>}

                {disputeDraft && (
                  <aside aria-label="Dispute Advocate draft" style={{ marginTop: "1rem", padding: "1rem", background: "#0b1020", border: "1px solid #293252", borderRadius: 6 }}>
                    <strong style={{ color: "#f0c674" }}>Dispute Advocate ({disputeDraft.source}):</strong>
                    <p style={{ marginTop: ".4rem", whiteSpace: "pre-wrap" }}>{disputeDraft.summary}</p>
                    <small style={{ color: "#b8c0d9" }}>Unknown facts are strictly marked &quot;not available&quot;; no hallucinations allowed.</small>
                  </aside>
                )}

                {/* Approval Inbox */}
                <section style={{ marginTop: "2rem" }}>
                  <h2>Approval Inbox</h2>
                  <small style={{ display: "block", color: "#8b9cff", marginBottom: ".6rem" }}>
                    Human-in-the-loop: purchases requiring explicit approval before a PayPal order can be created.
                  </small>
                  {approvals.length === 0 ? (
                    <p style={{ color: "#b8c0d9" }}>No approval requests pending.</p>
                  ) : approvals.map((approval) => (
                    <div key={approval.id} style={{ border: "1px solid #293252", borderRadius: 6, padding: "1rem", marginBottom: ".6rem", background: "#0b1020" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <b>{approval.status}</b>
                        <small>Run: <code>{approval.run_id}</code></small>
                      </div>
                      <p style={{ margin: ".4rem 0" }}>Total: ${Number(approval.total ?? 0).toFixed(2)}</p>
                      {approval.reason && <p style={{ color: "#f0c674", margin: ".4rem 0" }}>{approval.reason}</p>}
                      {approval.policy?.ruleResults?.filter((rule) => !rule.passed).map((rule) => (
                        <span key={rule.id} style={{ display: "inline-block", marginRight: ".35rem", padding: ".2rem .45rem", borderRadius: 999, background: "#3b3040", color: "#f0c674", fontSize: ".85rem" }}>
                          {rule.id}
                        </span>
                      ))}
                      {approval.expires_at && (
                        <p style={{ color: "#b8c0d9", fontSize: ".85rem", margin: ".4rem 0" }}>
                          {new Date(approval.expires_at).getTime() > now
                            ? `Expires in ${Math.max(0, Math.floor((new Date(approval.expires_at).getTime() - now) / 1000))}s`
                            : "Expired"}
                        </p>
                      )}
                      {approval.status === "PENDING" && (
                        <div style={{ display: "flex", gap: ".5rem", marginTop: ".6rem" }}>
                          <button
                            type="button"
                            disabled={actionLoading === `approval-${approval.id}`}
                            onClick={() => resolveApproval(approval.id, "APPROVED")}
                            style={{ padding: ".5rem 1rem", background: "#6ee7b7", color: "#08111f", fontWeight: 700, borderRadius: 4, cursor: "pointer" }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === `approval-${approval.id}`}
                            onClick={() => resolveApproval(approval.id, "REJECTED")}
                            style={{ padding: ".5rem 1rem", background: "#ff7b8b", color: "#08111f", fontWeight: 700, borderRadius: 4, cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </section>

                {/* Immutable Ledger Section */}
                <LedgerGrid rows={ledger as LedgerGridRow[]} valid={ledgerValid} onVerify={verifyLedgerNow} />
                {orderStatus && <p role="status" style={{ marginTop: ".6rem", color: "#6ee7b7" }}>{orderStatus}</p>}
              </div>

              {/* Proposed Cart Table */}
              <h2 style={{ marginTop: "2rem" }}>Proposed Cart</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: ".5rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #293252" }}>
                    <th align="left" style={{ padding: ".6rem" }}>Item</th>
                    <th align="left" style={{ padding: ".6rem" }}>Merchant</th>
                    <th align="center" style={{ padding: ".6rem" }}>Qty</th>
                    <th align="right" style={{ padding: ".6rem" }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cart.items.map((item) => (
                    <tr key={`${item.merchant}-${item.title}`} style={{ borderBottom: "1px solid #1c2438" }}>
                      <td style={{ padding: ".6rem" }}>{item.title}</td>
                      <td style={{ padding: ".6rem" }}>{item.merchant}</td>
                      <td align="center" style={{ padding: ".6rem" }}>{item.quantity}</td>
                      <td align="right" style={{ padding: ".6rem" }}>${item.unitPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Safety Flags */}
              {result.flags.length > 0 && (
                <>
                  <h2 style={{ marginTop: "2rem", color: "#f0c674" }}>Safety Flags</h2>
                  {result.flags.map((flag) => (
                    <p key={flag.code} style={{ color: "#f0c674", padding: ".4rem", background: "#2a2015", borderRadius: 4 }}>
                      <strong>{flag.code}:</strong> {flag.quote}
                    </p>
                  ))}
                </>
              )}

              {/* Deterministic Policy Rules Evaluation */}
              <h2 style={{ marginTop: "2rem" }}>Deterministic Policy Checks (13 Rules)</h2>
              <div style={{ display: "grid", gap: ".5rem" }}>
                {result.ruleResults.map((rule) => (
                  <div key={rule.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "1px solid #293252", padding: ".6rem 0" }}>
                    <span><b>{rule.id}</b> {rule.reason}</span>
                    <strong style={{ color: rule.passed ? "#6ee7b7" : "#ff7b8b" }}>{rule.passed ? "PASS" : "FAIL"}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
