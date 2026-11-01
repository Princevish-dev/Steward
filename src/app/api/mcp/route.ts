import { NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { buildCartFromTask } from "@/core/agents/shopper";
import { evaluatePolicy } from "@/core/policy/engine";
import { cartHash } from "@/core/payment/cart-hash";
import {
  createApproval,
  getMandate,
  getPurchaseHistory,
  listApprovals,
  persistRun
} from "@/core/domain/store";
import { authenticateMandateApiKey, getMandateForApiKey, isMandateKeyScopedTo } from "@/core/mcp/keys";

const toolNames = [
  "propose_purchase",
  "get_mandate_status",
  "list_my_purchases",
  "request_approval_status"
] as const;

function unauthorized() {
  return NextResponse.json({ error: "A valid mandate API key is required." }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "The API key is not authorized for this mandate." }, { status: 403 });
}

function makeServer(mandateId: string) {
  const server = new McpServer({ name: "steward", version: "1.0.0" });
  const mandateGuard = (requested: string) => {
    if (requested !== mandateId) throw new Error("FORBIDDEN_MANDATE");
  };

  server.registerTool("propose_purchase", {
    description: "Propose a purchase and return the deterministic policy decision.",
    inputSchema: { mandateId: z.string(), task: z.string() }
  }, async ({ mandateId: requested, task }) => {
    mandateGuard(requested);
    const mandate = await getMandate(mandateId);
    if (!mandate) throw new Error("Mandate not found.");
    const shopper = buildCartFromTask(task, mandate);
    const policy = evaluatePolicy({
      mandate,
      cart: shopper.cart,
      history: await getPurchaseHistory(mandateId),
      safetyFlags: shopper.flags.map((flag) => flag.code)
    });
    const runId = `run_mcp_${crypto.randomUUID()}`;
    await persistRun({
      runId,
      mandate,
      task,
      decision: policy.decision,
      cart: shopper.cart,
      policy,
      cartHash: cartHash({
        mandateId,
        currency: mandate.currency,
        items: shopper.cart.items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }))
      })
    });
    if (policy.decision === "ASK_HUMAN") await createApproval(runId, policy.ruleResults.filter((rule) => !rule.passed).map((rule) => rule.reason).join("; "));
    return { content: [{ type: "text" as const, text: JSON.stringify({ runId, decision: policy.decision, total: policy.total }) }] };
  });

  server.registerTool("get_mandate_status", {
    description: "Read the status of the authorized mandate.",
    inputSchema: { mandateId: z.string() }
  }, async ({ mandateId: requested }) => {
    mandateGuard(requested);
    const mandate = await getMandate(mandateId);
    if (!mandate) throw new Error("Mandate not found.");
    return { content: [{ type: "text" as const, text: JSON.stringify({ id: mandate.id, status: mandate.status, purpose: mandate.purpose }) }] };
  });

  server.registerTool("list_my_purchases", {
    description: "List aggregate purchases for the authorized mandate.",
    inputSchema: { mandateId: z.string() }
  }, async ({ mandateId: requested }) => {
    mandateGuard(requested);
    return { content: [{ type: "text" as const, text: JSON.stringify(await getPurchaseHistory(mandateId)) }] };
  });

  server.registerTool("request_approval_status", {
    description: "Read approval status for a run belonging to the authorized mandate.",
    inputSchema: { mandateId: z.string(), approvalId: z.string().optional() }
  }, async ({ mandateId: requested, approvalId }) => {
    mandateGuard(requested);
    const approvals = await listApprovals(mandateId);
    const matches = approvals.filter((approval) => !approvalId || approval.id === approvalId);
    return { content: [{ type: "text" as const, text: JSON.stringify(matches) }] };
  });
  return server;
}

async function handle(request: Request) {
  const rawKey = request.headers.get("x-steward-api-key");
  if (!rawKey) return unauthorized();
  const mandateId = await getMandateForApiKey(rawKey);
  if (!mandateId || !await authenticateMandateApiKey(rawKey, mandateId)) return unauthorized();

  const body = await request.clone().json().catch(() => null) as { params?: { arguments?: { mandateId?: unknown } } } | null;
  const requestedMandate = body?.params?.arguments?.mandateId;
  if (typeof requestedMandate === "string" && !isMandateKeyScopedTo(mandateId, requestedMandate)) return forbidden();

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = makeServer(mandateId);
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET() {
  return NextResponse.json({ protocol: "MCP Streamable HTTP", tools: toolNames });
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_MANDATE") return forbidden();
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP request failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  return handle(request);
}
