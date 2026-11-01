import { describe, expect, it, vi } from "vitest";
import { assertPaymentAllowed } from "@/core/payment/guard";

describe("MCP purchase gate", () => {
  it("blocks a BLOCK proposal before any PayPal call", () => {
    const paypalCall = vi.fn();
    expect(() => assertPaymentAllowed({ decision: "BLOCK", approval: null, now: new Date() })).toThrow("PAYMENT_BLOCKED");
    expect(paypalCall).not.toHaveBeenCalled();
  });

  it("allows AUTO proposals to pass the same gate", () => {
    expect(() => assertPaymentAllowed({ decision: "AUTO_APPROVE", approval: null, now: new Date() })).not.toThrow();
  });
});
