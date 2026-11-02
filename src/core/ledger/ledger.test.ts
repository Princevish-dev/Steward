import { describe, expect, it } from "vitest";
import { appendLedgerEntry, idempotencyKey } from "@/core/ledger/append";
import { verifyLedger } from "@/core/ledger/verify";
import type { LedgerEntry } from "@/core/ledger/types";
import { canonicalJson } from "@/core/ledger/canonical";

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

  it("accepts legacy entries hashed with the owner userId", () => {
    const legacy = appendLedgerEntry([], { ...input("RUN_STARTED"), userId: "alice@example.com" } as any);
    const persisted = { ...legacy } as any;
    delete persisted.userId;
    expect(verifyLedger([persisted])).toEqual({ valid: false, invalidSequence: 1 });
    expect(verifyLedger([persisted], "alice@example.com")).toEqual({ valid: true });
  });

  it("survives JSONB-style key reordering", () => {
    const first = appendLedgerEntry([], {
      ...input("RUN_STARTED"),
      payload: { z: { b: 2, a: 1 }, a: "first" }
    }, new Date("2099-01-01T00:00:00.000Z"));
    const roundTripped = {
      ...first,
      payload: { a: "first", z: { a: 1, b: 2 } }
    };
    expect(canonicalJson(roundTripped)).toBe(canonicalJson(first));
    expect(verifyLedger([roundTripped])).toEqual({ valid: true });
  });

  it("isolates chains by mandate and restores a tamper preview without mutating storage", () => {
    const first = appendLedgerEntry([], input("RUN_STARTED"), new Date("2099-01-01T00:00:00.000Z"));
    const otherMandate = appendLedgerEntry([], { ...input("RUN_STARTED"), mandateId: "mdt_2" }, new Date("2099-01-01T00:00:00.000Z"));
    expect(first.prevHash).toBe(otherMandate.prevHash);
    const tampered = { ...first, payload: { decision: "BLOCK" } };
    expect(verifyLedger([tampered]).valid).toBe(false);
    expect(verifyLedger([first]).valid).toBe(true);
  });

  it("derives stable payment idempotency keys", () => {
    expect(idempotencyKey("run_1", "cart_hash")).toBe(idempotencyKey("run_1", "cart_hash"));
    expect(idempotencyKey("run_1", "cart_hash")).not.toBe(idempotencyKey("run_2", "cart_hash"));
  });
});
