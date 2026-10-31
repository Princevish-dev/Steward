import { describe, expect, it } from "vitest";
import { toPayPalOrderRequest } from "@/core/paypal/orders";

describe("PayPal order boundary", () => {
  it("uses USD and a run/cart-derived idempotency key", () => {
    const request = toPayPalOrderRequest({
      runId: "run_1",
      cartHash: "cart_1",
      amount: 18.99,
      currency: "USD",
      vaultToken: "vault_token"
    });
    expect(request.amount).toBe("18.99");
    expect(request.currency_code).toBe("USD");
    expect(request.idempotencyKey).toHaveLength(64);
  });

  it("rejects payment without a vault token", () => {
    expect(() =>
      toPayPalOrderRequest({
        runId: "run_1",
        cartHash: "cart_1",
        amount: 18.99,
        currency: "USD",
        vaultToken: ""
      })
    ).toThrow("vault token");
  });
});
