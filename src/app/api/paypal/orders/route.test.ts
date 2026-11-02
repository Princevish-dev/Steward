import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";

const mocks = vi.hoisted(() => ({ getRunContext: vi.fn(), reservePaymentOrder: vi.fn(), createSandboxOrder: vi.fn() }));
vi.mock("@/core/domain/store", () => ({ getRunContext: mocks.getRunContext, reservePaymentOrder: mocks.reservePaymentOrder, persistPaymentOrder: vi.fn(), listPaymentOrdersForOwner: vi.fn() }));
vi.mock("@/core/paypal/orders", () => ({ createSandboxOrder: mocks.createSandboxOrder }));
import { POST } from "./route";

describe("POST /api/paypal/orders reconciliation guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks creating another PayPal action for a mismatched order", async () => {
    mocks.getRunContext.mockResolvedValue({
      order_id: "ORDER-1", reconciliation_status: "MISMATCH", mandate: { owner: "owner@example.com" }, mandate_status: "ACTIVE", decision: "AUTO_APPROVE", cart: { items: [] }, mandate_id: "mdt-1"
    });
    const response = await POST(new Request("http://localhost/api/paypal/orders", {
      method: "POST",
      headers: { cookie: `steward_session=${createSessionToken("owner@example.com")}`, "content-type": "application/json" },
      body: JSON.stringify({ runId: "run-1" })
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH" });
    expect(mocks.reservePaymentOrder).not.toHaveBeenCalled();
    expect(mocks.createSandboxOrder).not.toHaveBeenCalled();
  });
});
