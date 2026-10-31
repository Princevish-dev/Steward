import { NextResponse } from "next/server";
import { createSandboxOrder } from "@/core/paypal/orders";
import { persistPaymentOrder } from "@/core/domain/store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 422 });
  }
  const value = body as { runId?: unknown; cartHash?: unknown; amount?: unknown };
  if (
    typeof value.runId !== "string" ||
    typeof value.cartHash !== "string" ||
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0
  ) {
    return NextResponse.json({ error: "runId, cartHash, and positive amount are required." }, { status: 422 });
  }

  try {
    const order = await createSandboxOrder({
      runId: value.runId,
      cartHash: value.cartHash,
      amount: value.amount,
      currency: "USD",
      vaultToken: "approval-required"
    });
    const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href ?? null;
    await persistPaymentOrder({
      id: order.id,
      runId: value.runId,
      amount: value.amount,
      status: order.status,
      approvalUrl
    });
    return NextResponse.json({ orderId: order.id, status: order.status, approvalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal order creation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
