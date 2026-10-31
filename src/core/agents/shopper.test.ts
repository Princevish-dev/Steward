import { describe, expect, it } from "vitest";
import { buildCartFromProductIds, buildCartFromTask } from "@/core/agents/shopper";
import type { Mandate } from "@/core/mandate/schema";

const mandate: Mandate = {
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

describe("shopper", () => {
  it("builds a typed cart from product discovery", () => {
    const result = buildCartFromTask("A4 printer paper and coffee", mandate);
    expect(result.cart.items.length).toBe(2);
    expect(result.cart.items.every((item) => item.quantity === 1)).toBe(true);
    expect(result.flags).toEqual([]);
  });

  it("does not allow product text to alter mandate quantities", () => {
    const result = buildCartFromProductIds(["paper-a4-001"], mandate);
    expect(result.cart.items[0]?.quantity).toBe(1);
    expect(result.cart.items[0]?.quantity).toBeLessThanOrEqual(mandate.caps.maxQuantityPerItem);
  });

  it("returns no product for a category outside the mandate", () => {
    const result = buildCartFromProductIds(["cleaner-001"], mandate);
    expect(result.cart.items).toHaveLength(0);
  });
});
