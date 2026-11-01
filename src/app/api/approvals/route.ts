import { NextResponse } from "next/server";
import { listApprovals, resolveApproval } from "@/core/domain/store";
import { requireSessionOwner } from "@/core/auth/session";

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
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown; reviewer?: unknown } | null;
  if (!body || typeof body.id !== "string" || (body.status !== "APPROVED" && body.status !== "REJECTED") || typeof body.reviewer !== "string") {
    return NextResponse.json({ error: "id, status, and reviewer are required." }, { status: 422 });
  }
  try {
    const approval = await resolveApproval(body.id, body.status, body.reviewer, owner);
    if (!approval) return NextResponse.json({ error: "Approval is missing or already resolved." }, { status: 404 });
    return NextResponse.json({ approval });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve approval." }, { status: 500 });
  }
}
