import { NextResponse } from "next/server";
import { listDisputesForOwner } from "@/core/domain/store";
import { requireSessionOwner } from "@/core/auth/session";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    const disputes = await listDisputesForOwner(owner);
    return NextResponse.json({ disputes: disputes.map((d) => ({
      id: d.id,
      orderId: d.order_id,
      runId: d.run_id,
      status: d.status,
      createdAt: d.created_at
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list disputes." }, { status: 500 });
  }
}
