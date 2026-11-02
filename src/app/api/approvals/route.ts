import { NextResponse } from "next/server";
import { listApprovals, resolveApproval } from "@/core/domain/store";
import { requireSessionOwner } from "@/core/auth/session";
import { confirmApprovalWithChallenge } from "@/core/approvals/typed-confirm";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    return NextResponse.json({ approvals: await listApprovals(owner) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read approvals." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown; confirmation?: { nonce?: unknown; phrase?: unknown } } | null;
  if (!body || typeof body.id !== "string" || (body.status !== "APPROVED" && body.status !== "REJECTED")) {
    return NextResponse.json({ error: "id and a valid status are required." }, { status: 422 });
  }
  try {
    if (body.status === "APPROVED") {
      const typedConfirmationEnabled = process.env.FEATURE_TYPED_CONFIRM?.trim().toLowerCase() !== "false";
      if (!typedConfirmationEnabled) {
        const approval = await resolveApproval(body.id, "APPROVED", owner, owner);
        if (!approval) return NextResponse.json({ error: "Approval is missing or already resolved." }, { status: 404 });
        return NextResponse.json({ approval });
      }
      if (typeof body.confirmation?.nonce !== "string" || typeof body.confirmation.phrase !== "string") {
        return NextResponse.json({ error: "A one-time typed confirmation is required to approve." }, { status: 422 });
      }
      const result = await confirmApprovalWithChallenge({
        approvalId: body.id,
        owner,
        nonce: body.confirmation.nonce,
        phrase: body.confirmation.phrase,
        reviewer: owner
      });
      if (!result.ok) return NextResponse.json({ error: "Typed confirmation did not match or has expired." }, { status: 409 });
      return NextResponse.json({ approval: result.approval });
    }
    const approval = await resolveApproval(body.id, "REJECTED", owner, owner);
    if (!approval) return NextResponse.json({ error: "Approval is missing or already resolved." }, { status: 404 });
    return NextResponse.json({ approval });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve approval." }, { status: 500 });
  }
}
