export type StewardClientOptions = { baseUrl?: string; fetcher?: typeof fetch };
export type RunInput = { mandateId: string; task: string; scenario?: "within" | "ask" | "over-cap" | "hostile" };

export function createStewardClient(options: StewardClientOptions = {}) {
  const baseUrl = options.baseUrl ?? "";
  const fetcher = options.fetcher ?? fetch;
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
    const body = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(body.error ?? `Steward request failed (${response.status}).`);
    return body;
  }
  return {
    run: (input: RunInput) => request("/api/runs", { method: "POST", body: JSON.stringify(input) }),
    approvals: () => request("/api/approvals"),
    verifyLedger: () => request("/api/ledger/verify"),
    createOrder: (input: { runId: string }) => request("/api/paypal/orders", { method: "POST", body: JSON.stringify(input) }),
    capture: (input: { runId: string }) => request("/api/paypal/capture", { method: "POST", body: JSON.stringify(input) }),
    refund: (input: { runId: string }) => request("/api/paypal/refund", { method: "POST", body: JSON.stringify(input) }),
    createMcpKey: (mandateId: string) => request("/api/mcp/keys", { method: "POST", body: JSON.stringify({ mandateId }) }),
    exportLedger: (mandateId: string, format: "csv" | "json" = "json") =>
      request(`/api/ledger/export?mandateId=${encodeURIComponent(mandateId)}&format=${format}`)
  };
}
