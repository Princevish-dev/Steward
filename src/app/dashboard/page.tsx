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
  const [now, setNow] = useState(() => Date.now());
  const [mcpKey, setMcpKey] = useState<string | null>(null);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);
  const [disputeDraft, setDisputeDraft] = useState<{ summary: string; source: string } | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refreshControlRoom = useCallback(async () => {
    const currentMandateId = mandateId ?? new URLSearchParams(window.location.search).get("mandateId");
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

  async function resolveApproval(id: string, status: "APPROVED" | "REJECTED") {
    setActionLoading(`approval-${id}`);
    try {
      const response = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, reviewer: owner })
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
      if (!activeMandateId) {
        const draftResponse = await fetch("/api/mandates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner, intent: task })
        });
        const draft = await readJson<{ mandate?: { id: string }; error?: string }>(draftResponse);
        if (!draftResponse.ok || !draft.mandate) throw new Error(draft.error ?? "Could not create mandate draft.");
        const confirmResponse = await fetch(`/api/mandates/${draft.mandate.id}/confirm`, { method: "POST" });
        const confirmed = await readJson<{ mandate?: { id: string }; error?: string }>(confirmResponse);
        if (!confirmResponse.ok || !confirmed.mandate) throw new Error(confirmed.error ?? "Could not confirm mandate.");
        activeMandateId = confirmed.mandate.id;
        setMandateId(activeMandateId);
        setMandateStatus("Mandate ACTIVE");
      }
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mandateId: activeMandateId, task, scenario })
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
      setCaptureStatus(`Payment ${body.status}. Ledger entry #${body.ledgerSequence ?? "recorded"}.`);
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
    setRefundStatus("Issuing Sandbox refund...");
    try {
      const response = await fetch("/api/paypal/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: result.runId })
      });
      const body = await readJson<{ refundId?: string; error?: string }>(response);
      setRefundStatus(response.ok ? `Refund issued: ${body.refundId}` : body.error ?? "Refund failed.");
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
      setSimulationStatus(response.ok ? "SIMULATED dispute webhook accepted." : body.error ?? "Simulation failed.");
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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <Link href="/" style={{ color: "#8b9cff" }}>Back to Steward</Link>
      <h1>Steward control room</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Submit a task and inspect exactly what the agent proposed and why the deterministic policy engine decided.
      </p>
      <p style={{ color: "#f0c674" }}>PayPal Sandbox + Channel3 real/fixture search, simulated fulfilment.</p>
      <p style={{ color: "#b8c0d9" }}>Run Steward lets AI propose; deterministic policy decides; no payment happens without a stored valid decision.</p>
      <button type="button" onClick={startFreshSession} title="Clear the current owner session and start a new mandate" style={{ padding: ".7rem 1rem" }}>Start fresh owner session</button>

      <form onSubmit={submit} style={{ display: "grid", gap: "1rem", maxWidth: 760, marginTop: "2rem" }}>
        <label>
          Owner email
          <input value={owner} onChange={(event) => setOwner(event.target.value)} required type="email"
            style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem" }} />
        </label>
        <label>
          Purchase task
          <input value={task} onChange={(event) => setTask(event.target.value)} required
            style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem" }} />
        </label>
        <label>
          Scenario
          <select value={scenario} onChange={(event) => setScenario(event.target.value as typeof scenario)}
            style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }}>
            <option value="within">Within limits (AUTO)</option>
            <option value="ask">Above ask threshold (ASK_HUMAN)</option>
            <option value="over-cap">Over cap (BLOCK)</option>
            <option value="hostile">Hostile product (BLOCK)</option>
          </select>
        </label>
        <button type="submit" disabled={loading} title={loading ? "Waiting for policy evaluation" : "Ask the agent to propose a cart and run all policy checks"} style={{ width: "fit-content", padding: ".7rem 1rem", position: "relative", zIndex: 1 }}>
          {loading ? "Evaluating..." : "Run Steward"}
        </button>
      </form>
      <button type="button" onClick={checkPayPal} disabled={actionLoading === "paypal-health"} title="Check whether PayPal Sandbox credentials are configured" style={{ marginTop: "1rem", padding: ".7rem 1rem" }}>
        {actionLoading === "paypal-health" ? "Checking..." : "Check PayPal Sandbox"}
      </button>
      <button type="button" onClick={revokeMandate} disabled={!mandateId || actionLoading === "revoke"} title={mandateId ? "Permanently block future payments for this mandate" : "Run a mandate first"} style={{ marginTop: "1rem", marginLeft: ".5rem", padding: ".7rem 1rem" }}>
        Kill switch: revoke mandate
      </button>
      <p role="status">{mandateStatus}</p>
      <button type="button" onClick={createMcpKey} disabled={!mandateId || actionLoading === "mcp"} title={mandateId ? "Create a mandate-scoped key; it is shown once" : "Run a mandate first"} style={{ padding: ".7rem 1rem" }}>
        {actionLoading === "mcp" ? "Creating key..." : "Create mandate MCP key"}
      </button>
      {mcpKey && <p role="status">Copy this key now; it is shown once: <code>{mcpKey}</code></p>}
      <section aria-label="MCP tools" style={{ marginTop: "1.5rem", border: "1px solid #293252", borderRadius: 8, padding: "1rem", maxWidth: 760 }}>
        <h2>MCP tools</h2>
        <p>These four tools let an external agent propose and inspect purchases without bypassing the same mandate and payment gate.</p>
        <p>External agents can use these mandate-scoped tools:</p>
        <ul>
          <li><code>propose_purchase</code></li>
          <li><code>get_mandate_status</code></li>
          <li><code>list_my_purchases</code></li>
          <li><code>request_approval_status</code></li>
        </ul>
        <p style={{ color: "#b8c0d9" }}>Use the mandate key with the MCP endpoint. The same deterministic policy and payment gate apply.</p>
      </section>
      {paypalStatus && <p role="status">{paypalStatus}</p>}
      {approvedOrderId && (
        <section style={{ marginTop: "2rem", border: "1px solid #6ee7b7", borderRadius: 10, padding: "1rem" }}>
          <strong>Buyer approval received</strong>
          <p>Order: {approvedOrderId}</p>
          <button type="button" onClick={capturePayPalOrder} disabled={actionLoading === "capture"} title="Capture only the PayPal order approved by the buyer">
            {actionLoading === "capture" ? "Capturing..." : "Capture approved payment"}
          </button>
          {captureStatus && <p role="status">{captureStatus}</p>}
        </section>
      )}

      {result && (
        <section aria-live="polite" style={{ marginTop: "3rem" }}>
          {result.error ? <p role="alert" style={{ color: "#ff7b8b" }}>{result.error}</p> : (
            <>
              <div style={{ border: "1px solid #293252", borderRadius: 10, padding: "1rem" }}>
                <p style={{ margin: 0, color: "#b8c0d9" }}>Run {result.runId}</p>
                <h2 style={{ color: decisionColor[result.decision], marginBottom: 0 }}>
                  {result.decision.replace("_", " ")}
                </h2>
                <p>Total proposed: ${result.total.toFixed(2)}</p>
                <p>Channel3 source: <strong>{result.catalogSource ?? "fixture"}</strong>{result.catalogSource !== "real" && " (fixture fallback)"}</p>
                {result.catalogNotice && <p role="status">{result.catalogNotice}</p>}
                {result.ai && (
                  <div style={{ color: "#b8c0d9" }}>
                    <p>{result.ai.shopper?.model ? `Parsed by ${result.ai.shopper.model}` : "Parsed by deterministic fallback"}</p>
                    {result.ai.source === "fallback" && <strong>AI fallback used</strong>}
                    {result.ai.reasoning && <p>Agent reasoning: {result.ai.reasoning}</p>}
                    {result.reviewer?.rationale && <p>Reviewer rationale: {result.reviewer.rationale}</p>}
                  </div>
                )}
                {result.decision !== "BLOCK" && (
                  <>
                    <button type="button" onClick={createPayPalOrder} disabled={actionLoading === "create-order"} title="Create an order only when the stored decision allows payment">
                      {actionLoading === "create-order" ? "Creating order..." : "Create PayPal Sandbox Order"}
                    </button>
                    {approvalUrl && (
                      <a
                        href={approvalUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-block", marginLeft: ".5rem", padding: ".7rem 1rem", color: "#08111f", background: "#6ee7b7", borderRadius: 4, fontWeight: 700 }}
                      >
                        Approve in PayPal Sandbox
                      </a>
                    )}
                  </>
                )}
                {result.tracking && <p>Shipment: {result.tracking.status} — {result.tracking.carrier} / {result.tracking.trackingNumber} (simulated carrier)</p>}
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".75rem" }}>
                  <button type="button" onClick={refundPayment} disabled={actionLoading === "refund"} title="Issue a Sandbox refund for the captured order">
                    {actionLoading === "refund" ? "Refunding..." : "Refund captured payment"}
                  </button>
                  <button type="button" onClick={draftDispute} disabled={actionLoading === "dispute"} title="Draft evidence using ledger facts; unknown facts stay unavailable">
                    {actionLoading === "dispute" ? "Drafting..." : "Draft dispute evidence"}
                  </button>
                  <button type="button" onClick={replayDispute} disabled={actionLoading === "dispute-simulation"} title="Development-only local replay; not a live PayPal dispute">
                    {actionLoading === "dispute-simulation" ? "Simulating..." : "Simulate dispute (development only)"}
                  </button>
                </div>
                {refundStatus && <p role="status">{refundStatus}</p>}
                {simulationStatus && <p role="status">{simulationStatus}</p>}
                <p style={{ color: "#b8c0d9" }}>Dispute Advocate uses available ledger facts only; unknown facts are shown as “not available”.</p>
                {disputeDraft && <aside aria-label="Dispute Advocate draft"><b>Dispute Advocate ({disputeDraft.source})</b><p>{disputeDraft.summary}</p></aside>}
                <section style={{ marginTop: "3rem" }}>
                  <h2>Approval inbox</h2>
                  {approvals.length === 0 ? <p style={{ color: "#b8c0d9" }}>No approval requests.</p> : approvals.map((approval) => (
                    <div key={approval.id} style={{ border: "1px solid #293252", padding: "1rem", marginBottom: ".6rem" }}>
                      <b>{approval.status}</b> — run {approval.run_id}
                      <p>Total: ${Number(approval.total ?? 0).toFixed(2)}</p>
                      {approval.reason && <p>{approval.reason}</p>}
                      {approval.policy?.ruleResults?.filter((rule) => !rule.passed).map((rule) => (
                        <span key={rule.id} style={{ display: "inline-block", marginRight: ".35rem", padding: ".2rem .45rem", borderRadius: 999, background: "#3b3040", color: "#f0c674" }}>
                          {rule.id}
                        </span>
                      ))}
                      {approval.expires_at && (
                        <small>
                          {new Date(approval.expires_at).getTime() > now
                            ? `Expires in ${Math.max(0, Math.floor((new Date(approval.expires_at).getTime() - now) / 1000))}s`
                            : "Expired"}
                        </small>
                      )}
                      {approval.status === "PENDING" && (
                        <span style={{ display: "flex", gap: ".5rem" }}>
                          <button type="button" disabled={actionLoading === `approval-${approval.id}`} onClick={() => resolveApproval(approval.id, "APPROVED")}>Approve</button>
                          <button type="button" disabled={actionLoading === `approval-${approval.id}`} onClick={() => resolveApproval(approval.id, "REJECTED")}>Reject</button>
                        </span>
                      )}
                    </div>
                  ))}
                </section>
                <LedgerGrid rows={ledger as LedgerGridRow[]} valid={ledgerValid} onVerify={verifyLedgerNow} />
                {orderStatus && <p role="status">{orderStatus}</p>}
              </div>

              <h2>Proposed cart</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th align="left">Item</th><th align="left">Merchant</th><th>Qty</th><th align="right">Price</th></tr></thead>
                <tbody>
                  {result.cart.items.map((item) => (
                    <tr key={`${item.merchant}-${item.title}`}>
                      <td>{item.title}</td><td>{item.merchant}</td><td align="center">{item.quantity}</td><td align="right">${item.unitPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {result.flags.length > 0 && (
                <>
                  <h2>Safety flags</h2>
                  {result.flags.map((flag) => <p key={flag.code} style={{ color: "#f0c674" }}>{flag.code}: {flag.quote}</p>)}
                </>
              )}

              <h2>Policy checks</h2>
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
