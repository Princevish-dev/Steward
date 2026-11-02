import { NextResponse } from "next/server";
import { getSandboxRefund, refundSandboxCapture } from "@/core/paypal/orders";
import { comparePayPalRefund, paypalReconciliationEnabled } from "@/core/paypal/reconcile";
import { findRefundForOrder, getRunContext, persistPayPalReconciliation, persistRefund } from "@/core/domain/store";
import { recordLedgerEvent } from "@/core/ledger/store";
import { assertPaymentAllowed } from "@/core/payment/guard";
import { requireSessionOwner } from "@/core/auth/session";
import { consumeRefundChallenge } from "@/core/approvals/typed-refund";

export async function POST(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json().catch(() => null) as {
    runId?: unknown; orderId?: unknown; captureId?: unknown; amount?: unknown;
    confirmation?: { nonce?: unknown; phrase?: unknown };
  } | null;
  if (!body || typeof body.runId !== "string") {
    return NextResponse.json({ error: "runId is required." }, { status: 422 });
  }
  if ("orderId" in body || "captureId" in body || "amount" in body) {
    return NextResponse.json({ error: "orderId, captureId, and amount are server-controlled." }, { status: 422 });
  }
  try {
    const context = await getRunContext(body.runId);
    if (!context || !context.order_id || !context.capture_id || (context.order_status !== "COMPLETED" && context.order_status !== "PAID")) {
      return NextResponse.json({ error: "A completed captured order is required." }, { status: 409 });
    }
    if ((context.mandate as { owner?: string }).owner !== owner) return NextResponse.json({ error: "Run access denied." }, { status: 403 });
    if (context.reconciliation_status === "MISMATCH") {
      return NextResponse.json({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", paymentAttempted: false }, { status: 409 });
    }
    const decision = context.mandate_status === "REVOKED" ? "REVOKED" : context.decision;
    assertPaymentAllowed({
      decision,
      approval: context.approval_id ? { status: context.approval_status, expiresAt: context.approval_expires_at } : null,
      now: new Date()
    });
    const existingRefund = await findRefundForOrder(context.order_id);
    if (existingRefund) {
      if (!paypalReconciliationEnabled()) {
        return NextResponse.json({ refundId: existingRefund.id, status: existingRefund.status, idempotent: true, paypalConfirmed: false });
      }
      const witness = await getSandboxRefund(existingRefund.id);
      const reconciliation = comparePayPalRefund(witness, {
        id: existingRefund.id,
        amount: Number(existingRefund.amount ?? context.amount ?? 0),
        currency: String(context.currency ?? "USD"),
        status: String(existingRefund.status)
      });
      const persisted = await persistPayPalReconciliation({ kind: "REFUND", orderId: context.order_id, runId: body.runId, mandateId: context.mandate_id, ...reconciliation });
      if (persisted.status === "MISMATCH") {
        return NextResponse.json({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", mismatches: persisted.mismatches, paymentAttempted: false }, { status: 409 });
      }
      return NextResponse.json({
        refundId: existingRefund.id,
        status: existingRefund.status,
        idempotent: true,
        paypalConfirmed: true,
        reconciliationSequence: persisted.sequence
      });
    }
    if (process.env.FEATURE_TYPED_CONFIRM?.trim().toLowerCase() !== "false") {
      if (typeof body.confirmation?.nonce !== "string" || typeof body.confirmation.phrase !== "string") {
        return NextResponse.json({ error: "A one-time typed confirmation is required to refund." }, { status: 422 });
      }
      const confirmation = await consumeRefundChallenge({
        runId: body.runId,
        owner,
        nonce: body.confirmation.nonce,
        phrase: body.confirmation.phrase
      });
      if (!confirmation.ok) return NextResponse.json({ error: "Typed confirmation did not match or has expired." }, { status: 409 });
    }
    const refund = await refundSandboxCapture(context.capture_id);
    await persistRefund({ id: refund.id, orderId: context.order_id, amount: Number(context.amount ?? 0), status: refund.status, response: refund });
    if (!paypalReconciliationEnabled()) {
      const ledger = await recordLedgerEvent({
        type: "REFUND_ISSUED",
        runId: body.runId,
        mandateId: context.mandate_id,
        payload: { orderId: context.order_id, refundId: refund.id, status: refund.status }
      });
      return NextResponse.json({ refundId: refund.id, status: refund.status, paypalConfirmed: false, ledgerSequence: ledger.sequence });
    }
    const witness = await getSandboxRefund(refund.id);
    const reconciliation = comparePayPalRefund(witness, {
      id: refund.id,
      amount: Number(context.amount ?? 0),
      currency: String(context.currency ?? "USD"),
      status: refund.status
    });
    const persisted = await persistPayPalReconciliation({ kind: "REFUND", orderId: context.order_id, runId: body.runId, mandateId: context.mandate_id, ...reconciliation });
    if (persisted.status === "MISMATCH") {
      return NextResponse.json({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", mismatches: persisted.mismatches, paymentAttempted: true, refundId: refund.id, reconciliationSequence: persisted.sequence }, { status: 409 });
    }
    const ledger = await recordLedgerEvent({
      type: "REFUND_ISSUED",
      runId: body.runId,
      mandateId: context.mandate_id,
      payload: { orderId: context.order_id, refundId: refund.id, status: refund.status }
    });
    return NextResponse.json({ refundId: refund.id, status: refund.status, paypalConfirmed: true, reconciliationSequence: persisted.sequence, ledgerSequence: ledger.sequence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund failed.";
    const status = message === "MANDATE_REVOKED" || message === "PAYMENT_BLOCKED"
      ? 403
      : message === "APPROVAL_REQUIRED" ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
