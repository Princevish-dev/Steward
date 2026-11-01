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
  const [demoStatus, setDemoStatus] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [mcpKey, setMcpKey] = useState<string | null>(null);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);
  const [disputeDraft, setDisputeDraft] = useState<{ summary: string; source: string } | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  const refreshControlRoom = useCallback(async () => {
    const currentMandateId = mandateId ?? new URLSearchParams(window.location.search).get("mandateId");
    const [approvalResponse, ledgerResponse] = await Promise.all([
      fetch("/api/approvals"),
      currentMandateId
        ? fetch(`/api/ledger/verify?mandateId=${encodeURIComponent(currentMandateId)}`)
        : Promise.resolve(new Response(null, { status: 204 }))
    ]);
    if (approvalResponse.ok) setApprovals((await approvalResponse.json() as { approvals: Approval[] }).approvals);
    if (ledgerResponse.ok) {
      const body = await ledgerResponse.json() as { entries?: LedgerRow[]; verification?: { valid: boolean } };
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
      const body = await response.json() as { entries?: LedgerRow[]; verification?: { valid: boolean } };
      if (body.entries && body.verification) {
        setLedger(body.entries);
        setLedgerValid(body.verification.valid);
      }
    }
  }

  async function resolveApproval(id: string, status: "APPROVED" | "REJECTED") {
    const response = await fetch("/api/approvals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, reviewer: owner })
    });
    if (response.ok && status === "APPROVED") {
      const approval = approvals.find((item) => item.id === id);
      if (approval) {
        setResult((current) => current);
        setOrderStatus("Approval recorded. Creating a gated PayPal order...");
        const orderResponse = await fetch("/api/paypal/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId: approval.run_id })
        });
        const order = await orderResponse.json() as { approvalUrl?: string; error?: string };
        setApprovalUrl(order.approvalUrl ?? null);
        setOrderStatus(orderResponse.ok
          ? "PayPal Sandbox order created. Buyer approval is required before capture."
          : order.error ?? "Could not create the gated order.");
        if (order.approvalUrl) window.open(order.approvalUrl, "_blank", "noopener,noreferrer");
      }
    }
    await refreshControlRoom();
  }

  async function seedDemo() {
    setDemoStatus("Seeding sandbox buyer, active mandate, and sample runs...");
    const response = await fetch("/api/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner })
    });
    const body = await response.json() as { mandate?: { id: string }; error?: string };
    if (!response.ok || !body.mandate) {
      setDemoStatus(body.error ?? "Demo seed failed.");
      return;
    }

    setMandateId(body.mandate.id);
    setMandateStatus("Mandate ACTIVE — demo data ready.");
    setDemoStatus("Demo login ready. Sample runs and approval inbox loaded.");
    const ledgerResponse = await fetch(`/api/ledger/verify?mandateId=${encodeURIComponent(body.mandate.id)}`);
    if (ledgerResponse.ok) {
      const ledgerBody = await ledgerResponse.json() as { entries?: LedgerRow[]; verification?: { valid: boolean } };
      if (ledgerBody.entries && ledgerBody.verification) {
        setLedger(ledgerBody.entries);
        setLedgerValid(ledgerBody.verification.valid);
      }
    }
    await refreshControlRoom();
  }

  async function createMcpKey() {
    if (!mandateId) return;
    const response = await fetch("/api/mcp/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mandateId })
    });
    const body = await response.json() as { key?: string; error?: string };
    setMcpKey(response.ok ? body.key ?? null : body.error ?? "Could not create MCP key.");
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
        const draft = await draftResponse.json() as { mandate?: { id: string }; error?: string };
        if (!draftResponse.ok || !draft.mandate) throw new Error(draft.error ?? "Could not create mandate draft.");
        const confirmResponse = await fetch(`/api/mandates/${draft.mandate.id}/confirm`, { method: "POST" });
        const confirmed = await confirmResponse.json() as { mandate?: { id: string }; error?: string };
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
      const body = await response.json() as RunResult;
      setResult(response.ok ? body : { ...body, error: body.error ?? "Run failed." });
    } catch {
      setResult({ error: "Could not reach the Steward API." } as RunResult);
    } finally {
      setLoading(false);
    }

  }

  async function checkPayPal() {
    setPaypalStatus("Checking PayPal Sandbox...");
    const response = await fetch("/api/paypal/health");
    const body = await response.json() as { connected?: boolean; error?: string };
    setPaypalStatus(body.connected ? "PayPal Sandbox connected." : body.error ?? "PayPal connection failed.");
  }

  async function createPayPalOrder() {
    if (!result || result.decision === "BLOCK" || result.total <= 0) return;
    setOrderStatus("Creating PayPal Sandbox order...");
    const response = await fetch("/api/paypal/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: result.runId })
    });
    const body = await response.json() as { approvalUrl?: string; orderId?: string; error?: string };
    if (!response.ok) {
      setOrderStatus(body.error ?? "Could not create PayPal order.");
      return;
    }

    setApprovalUrl(body.approvalUrl ?? null);
    setOrderStatus(`Order ${body.orderId} created. ${body.approvalUrl ? "Open the approval link to continue." : ""}`);
    if (body.approvalUrl) window.open(body.approvalUrl, "_blank", "noopener,noreferrer");
  }

  async function capturePayPalOrder() {
    if (!approvedOrderId) return;
    setCaptureStatus("Capturing PayPal Sandbox order...");
    const response = await fetch("/api/paypal/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: approvedRunId ?? result?.runId })
    });
    const body = await response.json() as { status?: string; ledgerSequence?: number; error?: string; tracking?: { carrier?: string; trackingNumber?: string; status?: string; simulated?: boolean } };
    if (response.ok && body.tracking) setResult((current) => current ? { ...current, tracking: body.tracking } : current);
    setCaptureStatus(response.ok
      ? `Payment ${body.status}. Ledger entry #${body.ledgerSequence}.`
      : body.error ?? "Payment capture failed.");
  }

  async function refundPayment() {
    if (!result) return;
    setRefundStatus("Issuing Sandbox refund...");
    const response = await fetch("/api/paypal/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: result.runId })
    });
    const body = await response.json() as { refundId?: string; error?: string };
    setRefundStatus(response.ok ? `Refund issued: ${body.refundId}` : body.error ?? "Refund failed.");
  }

  async function draftDispute() {
    if (!result) return;
    const response = await fetch("/api/disputes/advocate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: result.runId })
    });
    const body = await response.json() as { draft?: { summary: string; source: string }; error?: string };
    setDisputeDraft(response.ok ? body.draft ?? null : { summary: body.error ?? "Dispute draft failed.", source: "fallback" });
  }

  async function replayDispute() {
    setSimulationStatus("Replaying SIMULATED dispute webhook...");
    const response = await fetch("/api/paypal/webhook/replay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: result?.runId })
    });
    const body = await response.json() as { accepted?: boolean; error?: string };
    setSimulationStatus(response.ok ? "SIMULATED dispute webhook accepted." : body.error ?? "Simulation failed.");
  }

  async function revokeMandate() {
    if (!mandateId) return;
    const response = await fetch(`/api/mandates/${mandateId}/revoke`, { method: "POST" });
    if (response.ok) setMandateStatus("Mandate REVOKED — all future payments blocked.");
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <Link href="/" style={{ color: "#8b9cff" }}>Back to Steward</Link>
      <h1>Steward control room</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Submit a task and inspect exactly what the agent proposed and why the deterministic policy engine decided.
      </p>
      <p style={{ color: "#f0c674" }}>PayPal Sandbox + Channel3 real/fixture search, simulated fulfilment.</p>
      <button type="button" onClick={seedDemo} style={{ padding: ".7rem 1rem" }}>Demo login — seed working data</button>
      {demoStatus && <p role="status">{demoStatus}</p>}

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
        <button type="submit" disabled={loading} style={{ width: "fit-content", padding: ".7rem 1rem", position: "relative", zIndex: 1 }}>
          {loading ? "Evaluating..." : "Run Steward"}
        </button>
      </form>
      <button type="button" onClick={checkPayPal} style={{ marginTop: "1rem", padding: ".7rem 1rem" }}>
        Check PayPal Sandbox
      </button>
      <button type="button" onClick={revokeMandate} disabled={!mandateId} style={{ marginTop: "1rem", marginLeft: ".5rem", padding: ".7rem 1rem" }}>
        Kill switch: revoke mandate
      </button>
      <p role="status">{mandateStatus}</p>
      <button type="button" onClick={createMcpKey} disabled={!mandateId} style={{ padding: ".7rem 1rem" }}>
        Create mandate MCP key
      </button>
      {mcpKey && <p role="status">Copy this key now; it is shown once: <code>{mcpKey}</code></p>}
      <section aria-label="MCP tools" style={{ marginTop: "1.5rem", border: "1px solid #293252", borderRadius: 8, padding: "1rem", maxWidth: 760 }}>
        <h2>MCP tools</h2>
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
          <button type="button" onClick={capturePayPalOrder} style={{ padding: ".7rem 1rem" }}>
            Capture approved payment
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
                    <button type="button" onClick={createPayPalOrder} style={{ padding: ".7rem 1rem" }}>
                      Create PayPal Sandbox Order
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
                  <button type="button" onClick={refundPayment}>Refund captured payment</button>
                  <button type="button" onClick={draftDispute}>Draft dispute evidence</button>
                  <button type="button" onClick={replayDispute}>Simulate dispute (development only)</button>
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
                          <button type="button" onClick={() => resolveApproval(approval.id, "APPROVED")}>Approve</button>
                          <button type="button" onClick={() => resolveApproval(approval.id, "REJECTED")}>Reject</button>
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
