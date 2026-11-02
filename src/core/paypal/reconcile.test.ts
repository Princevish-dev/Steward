import { describe, expect, it } from "vitest";
import { comparePayPalOrder, comparePayPalRefund, paypalReconciliationEnabled } from "./reconcile";

const order = {
  id: "ORDER-1",
  status: "COMPLETED",
  purchase_units: [{
    amount: { currency_code: "USD", value: "18.50" },
    payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "18.50" } }] }
  }]
};

describe("PayPal reconciliation witness", () => {
  it("defaults reconciliation on and only disables for an explicit false flag", () => {
    expect(paypalReconciliationEnabled({})).toBe(true);
    expect(paypalReconciliationEnabled({ FEATURE_RECONCILE: "false" })).toBe(false);
    expect(paypalReconciliationEnabled({ FEATURE_RECONCILE: "0" })).toBe(true);
  });
  it("confirms a captured order when remote amount, currency, and status agree", () => {
    expect(comparePayPalOrder(order, { id: "ORDER-1", amount: 18.5, currency: "USD", status: "PAID" })).toMatchObject({
      status: "RECONCILED",
      observed: { amount: 18.5, currency: "USD", status: "COMPLETED" }
    });
  });

  it("marks an order mismatched when PayPal reports a different amount", () => {
    const result = comparePayPalOrder({ ...order, purchase_units: [{ ...order.purchase_units[0], amount: { currency_code: "USD", value: "19.50" } }] }, {
      id: "ORDER-1", amount: 18.5, currency: "USD", status: "PAID"
    });
    expect(result.status).toBe("MISMATCH");
    expect(result.mismatches).toContain("amount");
  });

  it("confirms a refund and rejects a currency mismatch", () => {
    expect(comparePayPalRefund({ id: "REF-1", status: "COMPLETED", amount: { currency_code: "USD", value: "18.50" } }, {
      id: "REF-1", amount: 18.5, currency: "USD", status: "COMPLETED"
    }).status).toBe("RECONCILED");
    const mismatch = comparePayPalRefund({ id: "REF-1", status: "COMPLETED", amount: { currency_code: "EUR", value: "18.50" } }, {
      id: "REF-1", amount: 18.5, currency: "USD", status: "COMPLETED"
    });
    expect(mismatch.status).toBe("MISMATCH");
    expect(mismatch.mismatches).toContain("currency");
  });
});
