import { describe, expect, it } from "vitest";
import { combineDecisions } from "@/core/policy/engine";
import { mandateAiOutputSchema, reviewerAiOutputSchema } from "@/core/ai/schemas";

describe("AI safety contracts", () => {
  it("rejects malformed structured output", () => {
    expect(() => mandateAiOutputSchema.parse({ mandate: {}, clarifications: [], refusalReason: null })).toThrow();
    expect(() => reviewerAiOutputSchema.parse({ recommend: "approve" })).toThrow();
  });

  it("never lets an AI reviewer approve a blocked policy", () => {
    expect(combineDecisions("BLOCK", "AUTO")).toBe("BLOCK");
  });
});
