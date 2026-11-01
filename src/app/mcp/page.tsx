"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { DataTable } from "@/components/ui/data-table";
import { CopyButton } from "@/components/ui/copy-button";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

type ApiKeyRow = {
  id: string;
  mandateId: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
};

export default function McpPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<{ key: string; mandateId: string } | null>(null);
  const [newMandateId, setNewMandateId] = useState("");

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mcp/keys");
      if (!response.ok) throw new Error(`Failed to load API keys (${response.status}).`);
      const body = await readJson<{ keys: ApiKeyRow[] }>(response);
      setApiKeys(body.keys ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load MCP keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    if (!newMandateId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mandateId: newMandateId })
      });
      const body = await readJson<{ key?: string; keyPrefix?: string; mandateId?: string; error?: string }>(response);
      if (!response.ok || !body.key) {
        throw new Error(body.error ?? "Could not create MCP key.");
      }
      setShowKey({ key: body.key, mandateId: body.mandateId ?? newMandateId });
      void fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create MCP key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="MCP & API Keys"
        subtitle="Manage Model Context Protocol access and mandate-scoped API keys"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "MCP & API Keys", href: "/mcp" }]}
      />

      <section className="content-section mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Available MCP Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "propose_purchase", desc: "Propose a purchase and return the deterministic policy decision." },
            { name: "get_mandate_status", desc: "Read the status of the authorized mandate." },
            { name: "list_my_purchases", desc: "List aggregate purchases for the authorized mandate." },
            { name: "request_approval_status", desc: "Read approval status for a run belonging to the authorized mandate." }
          ].map((tool) => (
            <div key={tool.name} className="rounded-lg border border-border bg-surface-elevated p-4">
              <p className="text-sm font-mono text-text-primary mb-2">{tool.name}</p>
              <p className="text-xs text-text-secondary">{tool.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Create Mandate API Key</h2>
        <p className="text-sm text-text-secondary mb-4">
          Generate a SHA-256 hashed API key scoped to a specific mandate. The key is shown once — copy it immediately.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 max-w-md">
          <Input
            label="Mandate ID"
            value={newMandateId}
            onChange={(e) => setNewMandateId(e.target.value)}
            placeholder="mdt_..."
            className="flex-1"
          />
          <Button variant="primary" onClick={createKey} disabled={!newMandateId || loading}>
            {loading ? "Creating..." : "Create Key"}
          </Button>
        </div>
        {showKey && (
          <div className="mt-6 rounded-lg border border-success bg-success/10 p-4">
            <p className="text-xs font-semibold text-success mb-2">API Key (shown once)</p>
            <div className="flex gap-2">
              <CopyButton value={showKey.key} />
              <p className="text-xs text-text-secondary truncate">{showKey.key}</p>
            </div>
            <p className="text-xs text-text-secondary mt-2">Mandate: {showKey.mandateId}</p>
          </div>
        )}
      </section>

      <section className="content-section">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Your API Keys</h2>
        {apiKeys.length === 0 && !error ? (
          <EmptyState
            title="No API keys"
            description="Create a mandate-scoped API key to allow external agents to interact with Steward via MCP."
          />
        ) : (
          <DataTable
            columns={[
              { key: "mandateId", header: "Mandate ID", width: "30%" },
              { key: "keyPrefix", header: "Key Prefix", width: "25%" },
              { key: "status", header: "Status", width: "20%" },
              { key: "createdAt", header: "Created", width: "25%" }
            ]}
            data={apiKeys}
            renderCell={(item, key) => {
              if (key === "status") return <StatusBadge status={item.revokedAt ? "REVOKED" : "ACTIVE"} size="sm" />;
              if (key === "keyPrefix") return <code className="text-xs text-text-secondary">{item.keyPrefix}</code>;
              return item[key as keyof ApiKeyRow];
            }}
            rowKey={(item) => item.id}
          />
        )}
      </section>
    </div>
  );
}
