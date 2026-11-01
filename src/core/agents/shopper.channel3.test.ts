import { describe, expect, it, vi } from "vitest";
import { buildCartFromTaskWithChannel3 } from "@/core/agents/shopper";
import { evaluatePolicy } from "@/core/policy/engine";
import type { Mandate } from "@/core/mandate/schema";

const mandate: Mandate = {
  id: "mdt_test",
  owner: "judge@example.com",
  purpose: "Office shopping",
  currency: "USD",
  period: { type: "monthly", budget: 100 },
  caps: { perItem: 25, perTransaction: 50, maxQuantityPerItem: 2 },
  askAbove: 40,
  categories: ["office_supplies"],
  merchants: { allow: [], deny: [] },
  velocity: { maxAutoPurchasesPer24h: 5 },
  expiresAt: "2099-01-01T00:00:00.000Z",
  status: "ACTIVE",
  source: "fallback"
};

describe("Channel3 shopper category safety", () => {
  it("routes documented offers into the cart and evaluates all 13 rules", async () => {
    const searcher = vi.fn(async () => ({
      source: "real" as const,
      products: [{
        id: "real-paper",
        title: "A4 Printer Paper",
        description: "500 sheets",
        merchant: "trusted.example",
        category: "office_supplies" as const,
        price: 10,
        currency: "USD" as const,
        availability: "in_stock" as const,
        url: "https://trusted.example/paper"
      }]
    }));
    const shopper = await buildCartFromTaskWithChannel3("A4 printer paper", mandate, searcher);
    const policy = evaluatePolicy({
      mandate,
      cart: shopper.cart,
      history: { spentInPeriod: 0, autoPurchasesLast24h: 0, merchantsPurchasedUnderMandate: [] }
    });
    expect(shopper.catalogSource).toBe("real");
    expect(shopper.cart.items).toHaveLength(1);
    expect(shopper.cart.items[0]).toMatchObject({ title: "A4 Printer Paper", category: "office_supplies" });
    expect(policy.ruleResults).toHaveLength(13);
    expect(policy.decision).toBe("AUTO_APPROVE");
  });
});
