import { NextResponse } from "next/server";
import { readLedger } from "@/core/ledger/store";
import { verifyLedger } from "@/core/ledger/verify";
import { listApprovals } from "@/core/domain/store";

const tools = [
  { name: "steward_run", description: "Evaluate a mandate-based purchase", inputSchema: { type: "object" } },
  { name: "steward_list_approvals", description: "List pending and resolved approvals", inputSchema: { type: "object" } },
  { name: "steward_verify_ledger", description: "Verify the persisted hash chain", inputSchema: { type: "object" } }
];

export async function GET() {
  return NextResponse.json({ protocol: "steward-mcp-http", tools });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { tool?: unknown } | null;
  if (!body || typeof body.tool !== "string") return NextResponse.json({ error: "tool is required." }, { status: 422 });
  if (body.tool === "steward_list_approvals") return NextResponse.json({ content: [{ type: "json", data: await listApprovals() }] });
  if (body.tool === "steward_verify_ledger") {
    const entries = await readLedger();
    return NextResponse.json({ content: [{ type: "json", data: verifyLedger(entries) }] });
  }
  if (body.tool === "steward_run") return NextResponse.json({ content: [{ type: "text", text: "Call POST /api/runs with the task and owner fields." }] });
  return NextResponse.json({ error: "Unknown tool." }, { status: 404 });
}
