"use client";

import { FormEvent, useEffect, useState } from "react";

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
  error?: string;
};

type Approval = {
  id: string;
  run_id: string;
  status: string;
  reviewer?: string;
  reason?: string;
};

type LedgerRow = {
  sequence: number;
  timestamp: string;
  type: string;
  entryHash: string;
};

const decisionColor = {
  AUTO_APPROVE: "#6ee7b7",
  ASK_HUMAN: "#f0c674",
  BLOCK: "#ff7b8b"
};

export default function DashboardPage() {
  const [owner, setOwner] = useState("judge@example.com");
  const [task, setTask] = useState("A4 printer paper and coffee");
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [approvedOrderId, setApprovedOrderId] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerValid, setLedgerValid] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paypal") === "approved") {
      setApprovedOrderId(params.get("orderId"));
      setCaptureStatus("Buyer approval received. Capture the order to complete payment.");
    }
    void refreshControlRoom();
  }, []);

  async function refreshControlRoom() {
    const [approvalResponse, ledgerResponse] = await Promise.all([
      fetch("/api/approvals"),
      fetch("/api/ledger/verify")
    ]);
    if (approvalResponse.ok) setApprovals((await approvalResponse.json() as { approvals: Approval[] }).approvals);
    if (ledgerResponse.ok) {
      const body = await ledgerResponse.json() as { entries: LedgerRow[]; verification: { valid: boolean } };
      setLedger(body.entries);
      setLedgerValid(body.verification.valid);
    }
  }

  async function resolveApproval(id: string, status: "APPROVED" | "REJECTED") {
    await fetch("/api/approvals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, reviewer: owner })
    });
    await refreshControlRoom();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, task })
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
      body: JSON.stringify({ runId: result.runId, cartHash: "dashboard-cart", amount: result.total })
    });
    const body = await response.json() as { approvalUrl?: string; orderId?: string; error?: string };
    if (!response.ok) {
      setOrderStatus(body.error ?? "Could not create PayPal order.");
      return;
    }

    setOrderStatus(`Order ${body.orderId} created. ${body.approvalUrl ? "Open the approval link to continue." : ""}`);
    if (body.approvalUrl) window.open(body.approvalUrl, "_blank", "noopener,noreferrer");
  }

  async function capturePayPalOrder() {
    if (!approvedOrderId) return;
    setCaptureStatus("Capturing PayPal Sandbox order...");
    const response = await fetch("/api/paypal/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: approvedOrderId,
        runId: result?.runId,
        mandateId: "demo-mandate"
      })
    });
    const body = await response.json() as { status?: string; ledgerSequence?: number; error?: string };
    setCaptureStatus(response.ok
      ? `Payment ${body.status}. Ledger entry #${body.ledgerSequence}.`
      : body.error ?? "Payment capture failed.");
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <a href="/" style={{ color: "#8b9cff" }}>Back to Steward</a>
      <h1>Steward control room</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Submit a task and inspect exactly what the agent proposed and why the deterministic policy engine decided.
      </p>

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
        <button type="submit" disabled={loading} style={{ width: "fit-content", padding: ".7rem 1rem" }}>
          {loading ? "Evaluating..." : "Run Steward"}
        </button>
      </form>
      <button type="button" onClick={checkPayPal} style={{ marginTop: "1rem", padding: ".7rem 1rem" }}>
        Check PayPal Sandbox
      </button>
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
                {result.decision !== "BLOCK" && (
                  <button type="button" onClick={createPayPalOrder} style={{ padding: ".7rem 1rem" }}>
                    Create PayPal Sandbox Order
                  </button>
                )}
                <section style={{ marginTop: "3rem" }}>
                  <h2>Approval inbox</h2>
                  {approvals.length === 0 ? <p style={{ color: "#b8c0d9" }}>No approval requests.</p> : approvals.map((approval) => (
                    <div key={approval.id} style={{ border: "1px solid #293252", padding: "1rem", marginBottom: ".6rem" }}>
                      <b>{approval.status}</b> — run {approval.run_id}
                      {approval.reason && <p>{approval.reason}</p>}
                      {approval.status === "PENDING" && (
                        <span style={{ display: "flex", gap: ".5rem" }}>
                          <button type="button" onClick={() => resolveApproval(approval.id, "APPROVED")}>Approve</button>
                          <button type="button" onClick={() => resolveApproval(approval.id, "REJECTED")}>Reject</button>
                        </span>
                      )}
                    </div>
                  ))}
                </section>
                <section style={{ marginTop: "3rem" }}>
                  <h2>Ledger grid {ledgerValid === null ? "" : ledgerValid ? "— verified" : "— INVALID"}</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr><th align="left">Sequence</th><th align="left">Timestamp</th><th align="left">Type</th><th align="left">Hash</th></tr></thead>
                      <tbody>{ledger.map((entry) => (
                        <tr key={entry.sequence}><td>{entry.sequence}</td><td>{entry.timestamp}</td><td>{entry.type}</td><td style={{ fontFamily: "monospace" }}>{entry.entryHash.slice(0, 16)}…</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
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
