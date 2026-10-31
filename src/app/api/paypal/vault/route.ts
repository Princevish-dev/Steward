import { NextResponse } from "next/server";
import { createVaultOrder } from "@/core/paypal/orders";
import { persistPaymentOrder } from "@/core/domain/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { runId?: unknown; amount?: unknown; vaultId?: unknown } | null;
  if (!body || typeof body.runId !== "string" || typeof body.vaultId !== "string" || typeof body.amount !== "number") {
    return NextResponse.json({ error: "runId, amount, and vaultId are required." }, { status: 422 });
  }
  try {
    const order = await createVaultOrder({ runId: body.runId, amount: body.amount, vaultId: body.vaultId });
    await persistPaymentOrder({ id: order.id, runId: body.runId, amount: body.amount, status: order.status, vaultId: body.vaultId });
    return NextResponse.json({ orderId: order.id, status: order.status, mode: "VAULT_MERCHANT_INITIATED" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vault payment failed." }, { status: 502 });
  }
}
