import { NextResponse } from "next/server";
import { listApprovals, resolveApproval } from "@/core/domain/store";

export async function GET() {
  try {
    return NextResponse.json({ approvals: await listApprovals() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read approvals." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown; reviewer?: unknown } | null;
  if (!body || typeof body.id !== "string" || (body.status !== "APPROVED" && body.status !== "REJECTED") || typeof body.reviewer !== "string") {
    return NextResponse.json({ error: "id, status, and reviewer are required." }, { status: 422 });
  }
  try {
    const approval = await resolveApproval(body.id, body.status, body.reviewer);
    if (!approval) return NextResponse.json({ error: "Approval is missing or already resolved." }, { status: 404 });
    return NextResponse.json({ approval });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve approval." }, { status: 500 });
  }
}
