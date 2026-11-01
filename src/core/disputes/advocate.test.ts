import { describe, expect, it } from "vitest";
import { disputeAdvocateSchema, templateDisputeDraft } from "@/core/disputes/advocate";

describe("Dispute Advocate", () => {
  it("uses not available for missing evidence", () => {
    const draft = templateDisputeDraft({ mandateId: "m1", orderId: "o1" });
    expect(draft.authorization).toContain("not available");
    expect(disputeAdvocateSchema.parse(draft).recommendation).toBe("ACCEPT_CLAIM");
  });
});
