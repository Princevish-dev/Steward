import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";

const mocks = vi.hoisted(() => ({
  getRunContext: vi.fn(), findRefundForOrder: vi.fn(), refundSandboxCapture: vi.fn(), getSandboxRefund: vi.fn(), persistRefund: vi.fn(), recordLedgerEvent: vi.fn(), consumeRefundChallenge: vi.fn(), persistPayPalReconciliation: vi.fn()
}));
vi.mock("@/core/domain/store", () => ({ getRunContext: mocks.getRunContext, findRefundForOrder: mocks.findRefundForOrder, persistRefund: mocks.persistRefund, persistPayPalReconciliation: mocks.persistPayPalReconciliation }));
vi.mock("@/core/paypal/orders", () => ({ refundSandboxCapture: mocks.refundSandboxCapture, getSandboxRefund: mocks.getSandboxRefund }));
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: mocks.recordLedgerEvent }));
vi.mock("@/core/approvals/typed-refund", () => ({ consumeRefundChallenge: mocks.consumeRefundChallenge }));
import { POST } from "./route";

const context = { order_id: "ORDER-1", capture_id: "CAP-1", order_status: "PAID", mandate: { owner: "owner@example.com" }, mandate_status: "ACTIVE", decision: "AUTO_APPROVE", approval_id: null, mandate_id: "mdt-1", amount: "18.50", currency: "USD", reconciliation_status: "RECONCILED" };
const session = `steward_session=${createSessionToken("owner@example.com")}`;
const request = () => new Request("http://localhost/api/paypal/refund", { method: "POST", headers: { cookie: session, "content-type": "application/json" }, body: JSON.stringify({ runId: "run-1", confirmation: { nonce: "nonce", phrase: "CONFIRM $18.50" } }) });

describe("POST /api/paypal/refund reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRunContext.mockResolvedValue(context);
    mocks.findRefundForOrder.mockResolvedValue(null);
    mocks.consumeRefundChallenge.mockResolvedValue({ ok: true });
    mocks.refundSandboxCapture.mockResolvedValue({ id: "REF-1", status: "COMPLETED", amount: { value: "18.50", currency_code: "USD" } });
    mocks.persistRefund.mockResolvedValue(undefined);
    mocks.recordLedgerEvent.mockResolvedValue({ sequence: 21 });
    mocks.persistPayPalReconciliation.mockResolvedValue({ status: "RECONCILED", sequence: 20, mismatches: [] });
  });

  it("reconciles the refund witness after the provider call", async () => {
    mocks.getSandboxRefund.mockResolvedValue({ id: "REF-1", status: "COMPLETED", amount: { value: "18.50", currency_code: "USD" } });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.getSandboxRefund).toHaveBeenCalledWith("REF-1");
    expect(mocks.persistPayPalReconciliation).toHaveBeenCalledWith(expect.objectContaining({ kind: "REFUND", orderId: "ORDER-1", status: "RECONCILED" }));
  });

  it("blocks an order already marked mismatched", async () => {
    mocks.getRunContext.mockResolvedValue({ ...context, reconciliation_status: "MISMATCH" });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ decision: "BLOCK", reason: "PAYPAL_RECONCILIATION_MISMATCH", paymentAttempted: false });
    expect(mocks.refundSandboxCapture).not.toHaveBeenCalled();
  });
});
