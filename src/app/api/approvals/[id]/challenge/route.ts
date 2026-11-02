import { NextResponse } from "next/server";
import { requireSessionOwner } from "@/core/auth/session";
import { issueApprovalChallenge } from "@/core/approvals/typed-confirm";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    return NextResponse.json(await issueApprovalChallenge(id, owner));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare typed approval.";
    const status = message === "APPROVAL_NOT_AVAILABLE" ? 404 : message === "CHALLENGE_ALREADY_ISSUED" ? 409 : 500;
    return NextResponse.json({ error: status === 500 ? "Could not prepare typed approval." : message }, { status });
  }
}
