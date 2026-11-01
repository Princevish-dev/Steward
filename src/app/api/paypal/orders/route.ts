import { NextResponse } from "next/server";
import { createSandboxOrder } from "@/core/paypal/orders";
import { getRunContext, persistPaymentOrder, reservePaymentOrder } from "@/core/domain/store";
import { assertPaymentAllowed } from "@/core/payment/guard";
import { cartHash } from "@/core/payment/cart-hash";
import { requireSessionOwner } from "@/core/auth/session";

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
      cartHash: computedCartHash,
      amount,
      currency: "USD",
      vaultToken: "approval-required"
    });
    const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href ?? null;
    await persistPaymentOrder({
      id: order.id,
      runId: value.runId,
      amount,
      status: order.status,
      cartHash: computedCartHash,
      approvalUrl
    });
    return NextResponse.json({ orderId: order.id, status: order.status, approvalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal order creation failed.";
    const status = message === "MANDATE_REVOKED" || message === "PAYMENT_BLOCKED"
      ? 403
      : message === "APPROVAL_REQUIRED" ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
