import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: { title: "Steward API", version: "1.0.0", description: "Safety-first mandate purchasing API." },
    servers: [{ url: process.env.APP_BASE_URL ?? "http://localhost:3000" }],
    paths: {
      "/api/runs": { post: { summary: "Evaluate a purchase task", requestBody: { required: true }, responses: { "200": { description: "Policy decision and cart" } } } },
      "/api/approvals": { get: { summary: "List human approvals" }, patch: { summary: "Approve or reject a pending run" } },
      "/api/paypal/orders": { post: { summary: "Create a buyer-approved PayPal order", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["runId"], properties: { runId: { type: "string" } } } } } } } },
      "/api/paypal/vault": { post: { summary: "Create a Vault merchant-initiated order" } },
      "/api/paypal/capture": { post: { summary: "Capture an approved order idempotently", requestBody: { required: true } } },
      "/api/paypal/refund": { post: { summary: "Refund a captured payment", requestBody: { required: true } } },
      "/api/paypal/webhook": { post: { summary: "Verify and process PayPal webhooks" } },
      "/api/ledger/verify": { get: { summary: "Read and verify the hash chain" } },
      "/api/mcp": { post: { summary: "MCP Streamable HTTP endpoint", parameters: [{ in: "header", name: "x-steward-api-key", required: true, schema: { type: "string" } }] } }
    }
  });
}
