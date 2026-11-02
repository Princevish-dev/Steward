import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function ApiDocsPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="API Documentation"
        subtitle="OpenAPI 3.1 specification and endpoint reference"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "API Documentation", href: "/api-docs" }]}
      />

      <section className="content-section mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">OpenAPI 3.1 Specification</h2>
        <p className="text-sm text-text-secondary mb-4">
          The full API contract is available as OpenAPI 3.1 JSON. View the specification or import it into Postman.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/api/openapi" target="_blank" rel="noopener noreferrer">
              View OpenAPI Spec
            </Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/docs/postman_collection.json" download>Download Postman Collection</Link>
          </Button>
        </div>
      </section>

      <section className="content-section">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Endpoint Reference</h2>
        <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted">Method</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted">Endpoint</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted">Description</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/health</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Service health check</td>
                <td className="px-4 py-3 text-xs text-text-secondary">None</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/auth/login</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Authenticate and issue session token</td>
                <td className="px-4 py-3 text-xs text-text-secondary">None</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mandates/draft</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Parse natural language into mandate draft</td>
                <td className="px-4 py-3 text-xs text-text-secondary">None</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mandates</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Create or persist a mandate</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mandates/{'{id}'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Fetch mandate by ID</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mandates/{'{id}'}/confirm</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Activate a mandate</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mandates/{'{id}'}/revoke</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Revoke a mandate (kill switch)</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/runs</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Propose cart and evaluate policy</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET|PATCH</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/approvals</td>
                <td className="px-4 py-3 text-sm text-text-secondary">List, typed-confirm approval, or reject</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/approvals/{'{id}'}/challenge</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Issue a five-minute approval nonce and amount phrase</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/paypal/orders</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Create a gated PayPal order</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/paypal/capture</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Capture an approved order</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/paypal/refund</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Refund after typed confirmation</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/paypal/refund/challenge</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Issue a five-minute refund nonce and amount phrase</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/paypal/health</td>
                <td className="px-4 py-3 text-sm text-text-secondary">PayPal OAuth connectivity</td>
                <td className="px-4 py-3 text-xs text-text-secondary">None</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/paypal/webhook</td>
                <td className="px-4 py-3 text-sm text-text-secondary">PayPal webhook signature verification</td>
                <td className="px-4 py-3 text-xs text-text-secondary">PayPal Signature</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/ledger/verify</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Verify hash-chained audit ledger</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/ledger/export</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Export ledger as CSV or JSON</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">GET|POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mcp</td>
                <td className="px-4 py-3 text-sm text-text-secondary">MCP Streamable HTTP endpoint</td>
                <td className="px-4 py-3 text-xs text-text-secondary">MCP API Key</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/mcp/keys</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Generate mandate-scoped API key</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs text-text-secondary font-mono">POST</td>
                <td className="px-4 py-3 text-sm text-text-primary">/api/disputes/advocate</td>
                <td className="px-4 py-3 text-sm text-text-secondary">Generate dispute evidence packet</td>
                <td className="px-4 py-3 text-xs text-text-secondary">Session Cookie</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
