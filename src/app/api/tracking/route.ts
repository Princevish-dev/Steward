import { NextResponse } from "next/server";
import { listTrackingForOwner } from "@/core/domain/store";
import { requireSessionOwner } from "@/core/auth/session";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    const tracking = await listTrackingForOwner(owner);
    return NextResponse.json({ tracking: tracking.map((t) => ({
      orderId: t.order_id,
      runId: t.run_id,
      carrier: t.tracking_carrier ?? "SIMULATED_CARRIER",
      trackingNumber: t.tracking_number,
      status: t.tracking_status,
      simulated: true,
      createdAt: t.created_at
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list tracking." }, { status: 500 });
  }
}
