import { NextResponse } from "next/server";
import { listPaymentOrdersForOwner } from "@/core/domain/store";
import { requireSessionOwner } from "@/core/auth/session";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    const orders = await listPaymentOrdersForOwner(owner);
    const payments = orders
      .filter((o) => o.status === "COMPLETED" || o.status === "PAID")
      .map((o) => ({
        orderId: o.id,
        runId: o.run_id,
        captureId: o.capture_id,
        amount: Number(o.amount),
        currency: o.currency,
        status: o.status,
        createdAt: o.created_at
      }));
    return NextResponse.json({ payments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list payments." }, { status: 500 });
  }
}
