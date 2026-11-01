import { describe, expect, it } from "vitest";
import { mandateStatusDecision } from "@/core/mandate/lifecycle";

describe("mandate lifecycle", () => {
  it("keeps drafts blocked and revoked mandates explicitly blocked", () => {
    expect(mandateStatusDecision("DRAFT")).toEqual({ decision: "BLOCK", reason: "MANDATE_NOT_ACTIVE" });
    expect(mandateStatusDecision("REVOKED")).toEqual({ decision: "BLOCK", reason: "MANDATE_REVOKED" });
    expect(mandateStatusDecision("ACTIVE")).toBeNull();
  });
});
