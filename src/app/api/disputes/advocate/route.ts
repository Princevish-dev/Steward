import { NextResponse } from "next/server";
import { requireSessionOwner } from "@/core/auth/session";
import { getRunContext } from "@/core/domain/store";
import { readLedgerForRun } from "@/core/ledger/store";
import { createDisputeDraft } from "@/core/disputes/advocate";

export async function POST(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json().catch(() => null) as { runId?: unknown } | null;
  if (!body || typeof body.runId !== "string") return NextResponse.json({ error: "runId is required." }, { status: 422 });
  const context = await getRunContext(body.runId);
  if (!context) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  if ((context.mandate as { owner?: string }).owner !== owner) return NextResponse.json({ error: "Run access denied." }, { status: 403 });
  const draft = await createDisputeDraft({
    mandate: context.mandate,
    order: { id: context.order_id, status: context.order_status, captureId: context.capture_id },
    tracking: { carrier: context.tracking_carrier, trackingNumber: context.tracking_number, status: context.tracking_status },
    ledger: await readLedgerForRun(body.runId)
  });
  return NextResponse.json({ draft });
}
