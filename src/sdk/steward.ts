export type StewardClientOptions = { baseUrl?: string; fetcher?: typeof fetch };

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
    run: (input: { owner: string; task: string }) => request("/api/runs", { method: "POST", body: JSON.stringify(input) }),
    approvals: () => request("/api/approvals"),
    verifyLedger: () => request("/api/ledger/verify"),
    createOrder: (input: { runId: string; cartHash: string; amount: number }) => request("/api/paypal/orders", { method: "POST", body: JSON.stringify(input) }),
    refund: (input: { orderId: string; captureId: string; amount?: number }) => request("/api/paypal/refund", { method: "POST", body: JSON.stringify(input) })
  };
}
