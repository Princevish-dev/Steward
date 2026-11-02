import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";

const mocks = vi.hoisted(() => ({
  getRunContext: vi.fn(),
  captureSandboxOrder: vi.fn(),
  getSandboxOrder: vi.fn(),
  markOrderCaptured: vi.fn(),
  persistTracking: vi.fn(),
  addShipmentTracking: vi.fn(),
  persistPayPalReconciliation: vi.fn()
}));
vi.mock("@/core/domain/store", () => ({ getRunContext: mocks.getRunContext, markOrderCaptured: mocks.markOrderCaptured, persistTracking: mocks.persistTracking, persistPayPalReconciliation: mocks.persistPayPalReconciliation }));
vi.mock("@/core/paypal/orders", () => ({ captureSandboxOrder: mocks.captureSandboxOrder, getSandboxOrder: mocks.getSandboxOrder }));
vi.mock("@/core/paypal/tracking", () => ({ addShipmentTracking: mocks.addShipmentTracking }));
import { POST } from "./route";

const session = `steward_session=${createSessionToken("owner@example.com")}`;
const context = { order_id: "ORDER-1", order_status: "AWAITING_PAYPAL_APPROVAL", mandate: { owner: "owner@example.com" }, mandate_status: "ACTIVE", decision: "AUTO_APPROVE", cart: { items: [{ unitPrice: 18.5, quantity: 1 }] }, mandate_id: "mdt-1" };
const request = () => new Request("http://localhost/api/paypal/capture", { method: "POST", headers: { cookie: session, "content-type": "application/json" }, body: JSON.stringify({ runId: "run-1" }) });

describe("POST /api/paypal/capture reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRunContext.mockResolvedValue(context);
    mocks.captureSandboxOrder.mockResolvedValue({ id: "ORDER-1", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-1" }] } }] });
    mocks.markOrderCaptured.mockResolvedValue({ sequence: 12 });
    mocks.addShipmentTracking.mockResolvedValue({ carrier: "SIMULATED_CARRIER", trackingNumber: "SIM-1", status: "SHIPPED" });
  });

  it("blocks further processing when the PayPal witness mismatches", async () => {
    mocks.persistPayPalReconciliation.mockResolvedValue({ status: "MISMATCH", sequence: 13, mismatches: ["amount"] });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", paymentAttempted: true });
    expect(mocks.addShipmentTracking).not.toHaveBeenCalled();
  });

  it("re-witnesses an already paid order instead of capturing again", async () => {
    mocks.getRunContext.mockResolvedValue({ ...context, order_status: "PAID", reconciliation_status: "PENDING" });
    mocks.getSandboxOrder.mockResolvedValue({ id: "ORDER-1", status: "COMPLETED", purchase_units: [{ amount: { currency_code: "USD", value: "18.50" } }] });
    mocks.persistPayPalReconciliation.mockResolvedValue({ status: "RECONCILED", sequence: 14, mismatches: [] });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.getSandboxOrder).toHaveBeenCalledWith("ORDER-1");
    expect(mocks.captureSandboxOrder).not.toHaveBeenCalled();
  });
});
