import { NextResponse } from "next/server";
import { captureSandboxOrder } from "@/core/paypal/orders";
import { recordLedgerEvent } from "@/core/ledger/store";
import { findLedgerEvent } from "@/core/ledger/store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const value = body && typeof body === "object" ? body as { orderId?: unknown; runId?: unknown; mandateId?: unknown } : {};
  const orderId = value.orderId;
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 422 });
  }

  try {
    const existing = await findLedgerEvent("PAYMENT_CAPTURED", orderId);
    if (existing) {
      return NextResponse.json({ orderId, status: "COMPLETED", ledgerSequence: existing.sequence, idempotent: true });
    }
    const order = await captureSandboxOrder(orderId);
    const ledgerEntry = await recordLedgerEvent({
      type: "PAYMENT_CAPTURED",
      runId: typeof value.runId === "string" ? value.runId : "unknown",
      mandateId: typeof value.mandateId === "string" ? value.mandateId : "unknown",
      payload: { orderId: order.id, status: order.status }
    });
    return NextResponse.json({ orderId: order.id, status: order.status, ledgerSequence: ledgerEntry.sequence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal capture failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
