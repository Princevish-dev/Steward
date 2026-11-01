import { describe, expect, it } from "vitest";
import { draftMandateFromIntent, draftMandateWithAi, parseMandateDraft } from "@/core/mandate/parser";
import type { AiObjectGenerator } from "@/core/ai/client";

const validMandate = {
  id: "mdt_test",
  owner: "owner@example.com",
  purpose: "Studio supplies",
  currency: "USD",
  period: { type: "monthly", budget: 120 },
  caps: { perItem: 40, perTransaction: 80, maxQuantityPerItem: 4 },
  askAbove: 60,
  categories: ["office_supplies", "coffee_tea"],
  merchants: { allow: [], deny: [] },
  velocity: { maxAutoPurchasesPer24h: 2 },
  expiresAt: "2099-12-31T23:59:59.000Z",
  status: "ACTIVE"
};

describe("parseMandateDraft", () => {
  it("accepts a strict structured mandate", () => {
    expect(parseMandateDraft({ mandate: validMandate, clarifications: [], refusalReason: null }).mandate).toEqual(
      validMandate
    );
  });

  it("rejects unknown fields", () => {
    expect(() =>
      parseMandateDraft({
        mandate: { ...validMandate, hiddenLimit: 999999 },
        clarifications: [],
        refusalReason: null
      })
    ).toThrow("Invalid mandate draft");
  });

  it("preserves an explicit refusal", () => {
    expect(
      parseMandateDraft({
        mandate: null,
        clarifications: ["What monthly budget should apply?"],
        refusalReason: "The request does not define a spending limit."
      })
    ).toEqual({
      mandate: null,
      clarifications: ["What monthly budget should apply?"],
      refusalReason: "The request does not define a spending limit."
    });
  });

  it("extracts explicit budget and caps from the example intent", () => {
    const result = draftMandateFromIntent(
      "owner@example.com",
      "Reorder paper; max $120 a month; nothing over $40 per item; ask me above $60."
    );

    expect(result.mandate?.period.budget).toBe(120);
    expect(result.mandate?.caps.perItem).toBe(40);
    expect(result.mandate?.askAbove).toBe(60);
  });

  it("retries malformed output and marks fallback when both attempts fail", async () => {
    let attempts = 0;
    const result = await draftMandateWithAi("owner@example.com", "Buy paper under $40", (async () => {
      attempts += 1;
      throw new Error("invalid JSON");
    }) as AiObjectGenerator);
    expect(attempts).toBe(2);
    expect(result.source).toBe("fallback");
  });

  it("normalizes AI output to a DRAFT mandate", async () => {
    const result = await draftMandateWithAi("judge@example.com", "Buy paper", (async () => ({
      object: {
        mandate: { ...validMandate, owner: "ignored@example.com", status: "ACTIVE" },
        clarifications: [],
        refusalReason: null
      },
      meta: { model: "mock", latencyMs: 2 }
    })) as AiObjectGenerator);
    expect(result.mandate?.owner).toBe("judge@example.com");
    expect(result.mandate?.status).toBe("DRAFT");
    expect(result.source).toBe("llm");
  });
});
