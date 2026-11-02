import { NextResponse } from "next/server";
import { refundSandboxCapture } from "@/core/paypal/orders";
import { findRefundForOrder, getRunContext, persistRefund } from "@/core/domain/store";
import { recordLedgerEvent } from "@/core/ledger/store";
import { assertPaymentAllowed } from "@/core/payment/guard";
import { requireSessionOwner } from "@/core/auth/session";

export async function POST(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json().catch(() => null) as { runId?: unknown; orderId?: unknown; captureId?: unknown; amount?: unknown } | null;
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
    const decision = context.mandate_status === "REVOKED" ? "REVOKED" : context.decision;
    assertPaymentAllowed({
      decision,
      approval: context.approval_id ? { status: context.approval_status, expiresAt: context.approval_expires_at } : null,
      now: new Date()
    });
    const existingRefund = await findRefundForOrder(context.order_id);
    if (existingRefund) {
      return NextResponse.json({
        refundId: existingRefund.id,
        status: existingRefund.status,
        idempotent: true
      });
    }
    const refund = await refundSandboxCapture(context.capture_id);
    await persistRefund({ id: refund.id, orderId: context.order_id, status: refund.status, response: refund });
    const ledger = await recordLedgerEvent({
      type: "REFUND_ISSUED",
      runId: body.runId,
      mandateId: context.mandate_id,
      payload: { orderId: context.order_id, refundId: refund.id, status: refund.status }
    });
    return NextResponse.json({ refundId: refund.id, status: refund.status, ledgerSequence: ledger.sequence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund failed.";
    const status = message === "MANDATE_REVOKED" || message === "PAYMENT_BLOCKED"
      ? 403
      : message === "APPROVAL_REQUIRED" ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
