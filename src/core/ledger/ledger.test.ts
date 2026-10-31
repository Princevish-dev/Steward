import { describe, expect, it } from "vitest";
import { appendLedgerEntry, idempotencyKey } from "@/core/ledger/append";
import { verifyLedger } from "@/core/ledger/verify";
import type { LedgerEntry } from "@/core/ledger/types";

function input(type: string) {
  return {
    type,
    runId: "run_1",
    mandateId: "mdt_1",
    payload: { decision: "AUTO_APPROVE" }
  };
}

describe("ledger", () => {
  it("creates and verifies a hash chain", () => {
    const first = appendLedgerEntry([], input("RUN_STARTED"), new Date("2099-01-01T00:00:00.000Z"));
    const second = appendLedgerEntry([first], input("DECISION_MADE"), new Date("2099-01-01T00:01:00.000Z"));
    expect(verifyLedger([first, second])).toEqual({ valid: true });
  });

  it("detects payload tampering", () => {
    const first = appendLedgerEntry([], input("RUN_STARTED"));
    const tampered: LedgerEntry = { ...first, payload: { decision: "BLOCK" } };
    expect(verifyLedger([tampered])).toEqual({ valid: false, invalidSequence: 1 });
  });

  it("derives stable payment idempotency keys", () => {
    expect(idempotencyKey("run_1", "cart_hash")).toBe(idempotencyKey("run_1", "cart_hash"));
    expect(idempotencyKey("run_1", "cart_hash")).not.toBe(idempotencyKey("run_2", "cart_hash"));
  });
});
