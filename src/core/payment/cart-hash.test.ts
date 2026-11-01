import { describe, expect, it } from "vitest";
import { cartHash, paymentIdempotencyKey } from "@/core/payment/cart-hash";

describe("payment cart identity", () => {
  it("ignores volatile timestamps and preserves item identity", () => {
    const first = cartHash({
      mandateId: "mandate-1",
      currency: "USD",
      items: [{ productId: "paper", quantity: 1, unitPrice: 18.99, stockConfirmedAt: "one" }]
    });
    const second = cartHash({
      mandateId: "mandate-1",
      currency: "USD",
      items: [{ productId: "paper", quantity: 1, unitPrice: 18.99, stockConfirmedAt: "two" }]
    });
    expect(first).toBe(second);
    expect(paymentIdempotencyKey("run-1", first)).toHaveLength(64);
  });
});
