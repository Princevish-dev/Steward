import { describe, expect, it } from "vitest";
import { reviewPurchase } from "@/core/policy/reviewer";
import type { Cart } from "@/core/policy/types";
import type { AiObjectGenerator } from "@/core/ai/client";

const cart: Cart = { items: [] };
const base = { mandate: {}, cart, policyDecision: "AUTO_APPROVE" as const, ruleResults: [], flags: [], history: { spentInPeriod: 0, autoPurchasesLast24h: 0, merchantsPurchasedUnderMandate: [] } };

describe("AI risk reviewer", () => {
  it("falls back to ASK_HUMAN on timeout", async () => {
    const result = await reviewPurchase({ ...base, generator: (async () => { throw new Error("timeout"); }) as AiObjectGenerator });
    expect(result.decision).toBe("ASK_HUMAN");
    expect(result.riskFlags[0].code).toBe("REVIEWER_UNAVAILABLE");
  });

  it("escalates AUTO to ASK", async () => {
    const result = await reviewPurchase({ ...base, generator: (async () => ({
      object: { recommend: "ASK", riskFlags: [], rationale: "Needs review.", confidence: 0.9 },
      meta: { model: "mock", latencyMs: 1 }
    })) as AiObjectGenerator });
    expect(result.decision).toBe("ASK_HUMAN");
  });

  it("keeps BLOCK when reviewer says approve", async () => {
    const result = await reviewPurchase({ ...base, policyDecision: "BLOCK", generator: (async () => ({
      object: { recommend: "AUTO", riskFlags: [], rationale: "Approve.", confidence: 0.9 },
      meta: { model: "mock", latencyMs: 1 }
    })) as AiObjectGenerator });
    expect(result.decision).toBe("BLOCK");
  });
});
