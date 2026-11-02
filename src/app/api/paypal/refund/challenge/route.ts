import { NextResponse } from "next/server";
import { requireSessionOwner } from "@/core/auth/session";
import { issueRefundChallenge } from "@/core/approvals/typed-refund";

export async function POST(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { runId?: unknown } | null;
  if (!body || typeof body.runId !== "string") return NextResponse.json({ error: "runId is required." }, { status: 422 });
  try {
    return NextResponse.json(await issueRefundChallenge(body.runId, owner));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare typed refund.";
    const status = message === "REFUND_NOT_AVAILABLE" ? 404 : message === "CHALLENGE_ALREADY_ISSUED" ? 409 : 500;
    return NextResponse.json({ error: status === 500 ? "Could not prepare typed refund." : message }, { status });
  }
}
