import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/core/http/public-url";

export async function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request);
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Steward API",
      version: "1.0.0",
      description: "Safety-first autonomous purchasing API governed by explicit human mandates, 13 deterministic policy checks, and a tamper-evident SHA-256 audit ledger."
    },
    servers: [{ url: baseUrl, description: "Current environment" }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "steward_session"
        },
        mcpApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-steward-api-key"
        }
      }
    },
    paths: {
      "/api/health": { get: { summary: "Health check" } },
      "/api/cron/maintenance": { post: { summary: "Secret-authenticated expiry and maintenance job" } },
      "/api/auth/login": { post: { summary: "Authenticate and issue session token" } },
      "/api/auth/session": { get: { summary: "Read authenticated session user" } },
      "/api/auth/magic-link": { post: { summary: "Issue magic link token" }, get: { summary: "Consume magic link token" } },
      "/api/auth/logout": { post: { summary: "Clear session" } },
      "/api/mandates/draft": { post: { summary: "Parse natural language instructions into mandate draft" } },
      "/api/mandates": { get: { summary: "List mandates for the session owner" }, post: { summary: "Persist mandate definition" } },
      "/api/mandates/{id}": { get: { summary: "Fetch mandate by ID" } },
      "/api/mandates/{id}/confirm": { post: { summary: "Activate mandate" } },
      "/api/mandates/{id}/revoke": { post: { summary: "Emergency kill switch" } },
      "/api/runs": { get: { summary: "List purchase runs for the session owner" }, post: { summary: "Propose cart and evaluate deterministic policy" } },
      "/api/approvals": { get: { summary: "List human approvals" }, patch: { summary: "Approve with typed confirmation or reject a pending run" } },
      "/api/approvals/{id}/challenge": { post: { summary: "Issue a five-minute one-time typed approval challenge" } },
      "/api/payments": { get: { summary: "List captured payments for the session owner" } },
      "/api/paypal/orders": { get: { summary: "List PayPal orders for the session owner" }, post: { summary: "Create a gated PayPal Sandbox order" } },
      "/api/paypal/capture": { post: { summary: "Capture an approved order idempotently" } },
      "/api/paypal/refund/challenge": { post: { summary: "Issue a five-minute typed refund challenge" } },
      "/api/paypal/refund": { post: { summary: "Refund a captured payment after typed confirmation" } },
      "/api/paypal/vault": { post: { summary: "Vault endpoint (410 Gated)" } },
      "/api/paypal/health": { get: { summary: "PayPal Sandbox OAuth health check" } },
      "/api/paypal/return": { get: { summary: "PayPal buyer redirect handler" } },
      "/api/paypal/webhook": { post: { summary: "PayPal webhook signature verification" } },
      "/api/paypal/webhook/replay": { post: { summary: "Simulate dispute webhook (Dev only)" } },
      "/api/disputes": { get: { summary: "List disputes for the session owner" } },
      "/api/disputes/advocate": { post: { summary: "Generate dispute evidence packet" } },
      "/api/refunds": { get: { summary: "List refunds for the session owner" } },
      "/api/tracking": { get: { summary: "List shipment tracking for the session owner" } },
      "/api/ledger/verify": { get: { summary: "Read and verify hash chain" }, post: { summary: "Verify candidate entries" } },
      "/api/ledger/export": { get: { summary: "Download audit ledger as CSV or JSON" } },
      "/api/mcp": { get: { summary: "Discover MCP tools" }, post: { summary: "Streamable HTTP MCP tool execution" }, delete: { summary: "Close MCP session" } },
      "/api/mcp/keys": { get: { summary: "List mandate-scoped API keys" }, post: { summary: "Generate mandate-scoped MCP API key" } },
      "/api/redteam": { post: { summary: "Evaluate adversarial prompt injection fixture" } },
      "/api/openapi": { get: { summary: "Fetch OpenAPI 3.1.0 specification" } }
    }
  });
}
