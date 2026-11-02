import { NextResponse } from "next/server";
import { createSandboxOrder } from "@/core/paypal/orders";
import { getRunContext, persistPaymentOrder, reservePaymentOrder, listPaymentOrdersForOwner } from "@/core/domain/store";
import { assertPaymentAllowed } from "@/core/payment/guard";
import { cartHash } from "@/core/payment/cart-hash";
import { requireSessionOwner } from "@/core/auth/session";
import { getPublicBaseUrl } from "@/core/http/public-url";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    const orders = await listPaymentOrdersForOwner(owner);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list orders." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 422 });
  }
  const value = body as { runId?: unknown; amount?: unknown; orderId?: unknown };
  if ("amount" in value || "orderId" in value) {
    return NextResponse.json({ error: "amount and orderId are server-controlled." }, { status: 422 });
  }
  if (typeof value.runId !== "string" || !value.runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 422 });
  }

  try {
    const context = await getRunContext(value.runId);
    if (!context) return NextResponse.json({ error: "Run not found." }, { status: 404 });
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
    const items = (context.cart as { items: Array<{ productId: string; quantity: number; unitPrice: number }> }).items;
    const computedCartHash = cartHash({ mandateId: context.mandate_id, currency: "USD", items });
    const amount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const reservation = await reservePaymentOrder({ runId: value.runId, amount, cartHash: computedCartHash });
    if (!reservation) {
      const existing = await getRunContext(value.runId);
      return NextResponse.json({
        orderId: existing?.order_id,
        status: existing?.order_status,
        approvalUrl: existing?.approval_url,
        idempotent: true
      });
    }
    const order = await createSandboxOrder({
      runId: value.runId,
      mandateId: context.mandate_id,
      cartHash: computedCartHash,
      amount,
      currency: "USD",
      vaultToken: "approval-required",
      publicBaseUrl: getPublicBaseUrl(request)
    });
    const approvalUrl = order.links?.find((link) => link.rel === "approve" || link.rel === "payer-action")?.href ?? null;
    await persistPaymentOrder({
      id: order.id,
      runId: value.runId,
      amount,
      status: "AWAITING_PAYPAL_APPROVAL",
      cartHash: computedCartHash,
      approvalUrl
    });
    return NextResponse.json({ orderId: order.id, status: "AWAITING_PAYPAL_APPROVAL", approvalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal order creation failed.";
    const status = message === "MANDATE_REVOKED" || message === "PAYMENT_BLOCKED"
      ? 403
      : message === "APPROVAL_REQUIRED" ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
