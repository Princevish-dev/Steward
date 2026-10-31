import { NextResponse } from "next/server";
import { refundSandboxCapture } from "@/core/paypal/orders";
import { persistRefund } from "@/core/domain/store";
import { recordLedgerEvent } from "@/core/ledger/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { captureId?: unknown; orderId?: unknown; runId?: unknown; mandateId?: unknown; amount?: unknown } | null;
  if (!body || typeof body.captureId !== "string" || typeof body.orderId !== "string") {
    return NextResponse.json({ error: "captureId and orderId are required." }, { status: 422 });
  }
  const amount = body.amount === undefined ? undefined : Number(body.amount);
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "amount must be positive when provided." }, { status: 422 });
  }
  try {
    const refund = await refundSandboxCapture(body.captureId, amount);
    await persistRefund({ id: refund.id, orderId: body.orderId, amount, status: refund.status, response: refund });
    const ledger = await recordLedgerEvent({
      type: "PAYMENT_REFUNDED",
      runId: typeof body.runId === "string" ? body.runId : "unknown",
      mandateId: typeof body.mandateId === "string" ? body.mandateId : "unknown",
      payload: { orderId: body.orderId, refundId: refund.id, status: refund.status }
    });
    return NextResponse.json({ refundId: refund.id, status: refund.status, ledgerSequence: ledger.sequence });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refund failed." }, { status: 502 });
  }
}
