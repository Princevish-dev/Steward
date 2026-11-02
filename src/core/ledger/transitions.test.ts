import { describe, expect, it } from "vitest";
import { REQUIRED_LEDGER_TRANSITIONS } from "@/core/ledger/transitions";

describe("ledger transition coverage", () => {
  it("defines every required state transition", () => {
    expect(REQUIRED_LEDGER_TRANSITIONS).toEqual(expect.arrayContaining([
      "MANDATE_CREATED", "MANDATE_CONFIRMED", "MANDATE_TAMPERED", "MANDATE_REVOKED", "RUN_STARTED", "CART_PROPOSED",
      "DECISION_MADE", "APPROVAL_CREATED", "APPROVAL_APPROVED", "APPROVAL_REJECTED",
      "ORDER_CREATED", "ORDER_CAPTURED", "RECONCILED", "MISMATCH", "WEBHOOK_RECEIVED", "DISPUTE_OPENED"
    ]));
  });
});
