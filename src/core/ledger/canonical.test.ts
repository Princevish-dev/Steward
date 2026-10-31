import { describe, expect, it } from "vitest";
import { canonicalJson } from "@/core/ledger/canonical";

describe("ledger canonicalization", () => {
  it("makes object key order irrelevant", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
  });
});
