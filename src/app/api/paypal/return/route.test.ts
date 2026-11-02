import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getRunContext: vi.fn(), getRunContextByOrderId: vi.fn(), getSandboxOrder: vi.fn(), captureSandboxOrder: vi.fn(), markOrderCaptured: vi.fn(), persistPayPalReconciliation: vi.fn(), addShipmentTracking: vi.fn(), persistTracking: vi.fn() }));
vi.mock("@/core/domain/store", () => ({ getRunContext: mocks.getRunContext, getRunContextByOrderId: mocks.getRunContextByOrderId, markOrderCaptured: mocks.markOrderCaptured, persistPayPalReconciliation: mocks.persistPayPalReconciliation, persistTracking: mocks.persistTracking }));
vi.mock("@/core/paypal/orders", () => ({ captureSandboxOrder: mocks.captureSandboxOrder, getSandboxOrder: mocks.getSandboxOrder }));
vi.mock("@/core/paypal/tracking", () => ({ addShipmentTracking: mocks.addShipmentTracking }));
vi.mock("@/core/http/public-url", () => ({ getPublicBaseUrl: () => "https://steward.example" }));
import { GET } from "./route";

describe("GET /api/paypal/return reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRunContext.mockResolvedValue({ id: "run-1", mandate_id: "mdt-1", order_id: "ORDER-1", order_status: "AWAITING_PAYPAL_APPROVAL", amount: "18.50", currency: "USD", cart: { items: [{ unitPrice: 18.5, quantity: 1 }] }, mandate: { owner: "owner@example.com" } });
    mocks.captureSandboxOrder.mockResolvedValue({ id: "ORDER-1", status: "COMPLETED", purchase_units: [{ amount: { value: "18.50", currency_code: "USD" }, payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { value: "18.50", currency_code: "USD" } }] } }] });
    mocks.markOrderCaptured.mockResolvedValue(undefined);
    mocks.persistPayPalReconciliation.mockResolvedValue({ status: "MISMATCH", sequence: 4, mismatches: ["amount"] });
  });

  it("does not add tracking or redirect as success when the return capture mismatches", async () => {
    const response = await GET(new Request("https://steward.example/api/paypal/return?token=ORDER-1&runId=run-1"));
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("paypal=error");
    expect(location).toContain("PAYPAL_RECONCILIATION_MISMATCH");
    expect(mocks.addShipmentTracking).not.toHaveBeenCalled();
  });
});
