import { NextResponse } from "next/server";
import { captureSandboxOrder, getSandboxOrder } from "@/core/paypal/orders";
import { comparePayPalOrder, paypalReconciliationEnabled } from "@/core/paypal/reconcile";
import { getRunContext, markOrderCaptured, persistPayPalReconciliation } from "@/core/domain/store";
import { assertPaymentAllowed } from "@/core/payment/guard";
import { requireSessionOwner } from "@/core/auth/session";
import { addShipmentTracking } from "@/core/paypal/tracking";
import { persistTracking } from "@/core/domain/store";

export async function POST(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json().catch(() => null) as { runId?: unknown; orderId?: unknown } | null;
  if (!body || typeof body.runId !== "string" || !body.runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 422 });
  }
  if ("orderId" in body) return NextResponse.json({ error: "orderId is server-controlled." }, { status: 422 });
  try {
    const context = await getRunContext(body.runId);
    if (!context || !context.order_id) return NextResponse.json({ error: "Order for run not found." }, { status: 404 });
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
    if (context.order_status === "PAID" || context.order_status === "COMPLETED") {
      if (!paypalReconciliationEnabled()) {
        return NextResponse.json({ orderId: context.order_id, status: "PAID", idempotent: true, paypalConfirmed: false });
      }
      const witness = await getSandboxOrder(context.order_id);
      const reconciliation = comparePayPalOrder(witness, {
        id: context.order_id,
        amount: Number(context.amount ?? 0),
        currency: String(context.currency ?? "USD"),
        status: "PAID",
        captureId: context.capture_id
      });
      const persisted = await persistPayPalReconciliation({ kind: "ORDER", orderId: context.order_id, runId: body.runId, mandateId: context.mandate_id, ...reconciliation });
      if (persisted.status === "MISMATCH") {
        return NextResponse.json({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", mismatches: persisted.mismatches, paymentAttempted: false }, { status: 409 });
      }
      return NextResponse.json({ orderId: context.order_id, status: "PAID", idempotent: true, paypalConfirmed: true, reconciliationSequence: persisted.sequence });
    }
    const order = await captureSandboxOrder(context.order_id);
    const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const amount = (context.cart as { items: Array<{ unitPrice: number; quantity: number }> }).items
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const captureLedger = await markOrderCaptured(body.runId, captureId, amount);
    if (!paypalReconciliationEnabled()) {
      const tracking = await addShipmentTracking(order.id, body.runId);
      await persistTracking(body.runId, tracking);
      return NextResponse.json({ orderId: order.id, status: "PAID", captureId, tracking, paypalConfirmed: false, ledgerSequence: captureLedger?.sequence });
    }
    const reconciliation = comparePayPalOrder(order, {
      id: context.order_id,
      amount,
      currency: String(context.currency ?? "USD"),
      status: "PAID",
      captureId
    });
    const persisted = await persistPayPalReconciliation({ kind: "ORDER", orderId: context.order_id, runId: body.runId, mandateId: context.mandate_id, ...reconciliation });
    if (persisted.status === "MISMATCH") {
      return NextResponse.json({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", mismatches: persisted.mismatches, paymentAttempted: true, ledgerSequence: persisted.sequence }, { status: 409 });
    }
    const tracking = await addShipmentTracking(order.id, body.runId);
    await persistTracking(body.runId, tracking);
    return NextResponse.json({ orderId: order.id, status: "PAID", captureId, tracking, paypalConfirmed: true, reconciliationSequence: persisted.sequence, ledgerSequence: captureLedger?.sequence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal capture failed.";
    const status = message === "MANDATE_REVOKED" || message === "PAYMENT_BLOCKED" ? 403 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
