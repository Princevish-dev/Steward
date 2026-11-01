import { describe, expect, it } from "vitest";
import { assertPaymentAllowed } from "@/core/payment/guard";

describe("payment safety gate", () => {
  it("allows only auto approval or an unexpired approved review", () => {
    expect(() => assertPaymentAllowed({ decision: "AUTO_APPROVE", approval: null, now: new Date() })).not.toThrow();
    expect(() => assertPaymentAllowed({
      decision: "ASK_HUMAN",
      approval: { status: "APPROVED", expiresAt: new Date(Date.now() + 60_000) },
      now: new Date()
    })).not.toThrow();
  });

  it("rejects blocked, revoked, pending, and expired states before PayPal", () => {
    for (const state of [
      { decision: "BLOCK" as const, approval: null },
      { decision: "REVOKED" as const, approval: null },
      { decision: "ASK_HUMAN" as const, approval: { status: "PENDING", expiresAt: null } },
      { decision: "ASK_HUMAN" as const, approval: { status: "APPROVED", expiresAt: new Date(Date.now() - 1) } }
    ]) {
      expect(() => assertPaymentAllowed({ ...state, now: new Date() })).toThrow();
    }
  });
});
