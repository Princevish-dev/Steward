import { NextResponse } from "next/server";
import { listRefundsForOwner } from "@/core/domain/store";
import { requireSessionOwner } from "@/core/auth/session";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    const refunds = await listRefundsForOwner(owner);
    return NextResponse.json({ refunds: refunds.map((r) => ({
      refundId: r.refund_id,
      orderId: r.order_id,
      runId: r.run_id,
      amount: r.amount !== null ? Number(r.amount) : null,
      status: r.status,
      createdAt: r.created_at
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list refunds." }, { status: 500 });
  }
}
