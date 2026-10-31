import { describe, expect, it } from "vitest";
import { combineDecisions, evaluatePolicy } from "@/core/policy/engine";
import type { Mandate } from "@/core/mandate/schema";
import type { Cart } from "@/core/policy/types";

const mandate: Mandate = {
  id: "mdt_test",
  owner: "owner@example.com",
  purpose: "Office supplies",
  currency: "USD",
  period: { type: "monthly", budget: 120 },
  caps: { perItem: 40, perTransaction: 80, maxQuantityPerItem: 4 },
  askAbove: 60,
  categories: ["office_supplies"],
  merchants: { allow: [], deny: ["blocked.example"] },
  velocity: { maxAutoPurchasesPer24h: 2 },
  expiresAt: "2099-12-31T23:59:59.000Z",
  status: "ACTIVE"
};

const cart: Cart = {
  items: [
    {
      productId: "paper",
      title: "Printer paper",
      merchant: "shop.example",
      category: "office_supplies",
      unitPrice: 20,
      quotedUnitPrice: 20,
      quantity: 1,
      currency: "USD",
      stockConfirmedAt: "2099-01-01T00:00:00.000Z"
    }
  ]
};

const history = {
  spentInPeriod: 0,
  autoPurchasesLast24h: 0,
  merchantsPurchasedUnderMandate: ["shop.example"]
};

describe("evaluatePolicy", () => {
  it("auto-approves a valid cart", () => {
    expect(evaluatePolicy({ mandate, cart, history, now: new Date("2099-01-01T00:05:00.000Z") }).decision).toBe(
      "AUTO_APPROVE"
    );
  });

  it("blocks a cart when a blocking rule fails", () => {
    const result = evaluatePolicy({
      mandate,
      cart: { ...cart, items: [{ ...cart.items[0], merchant: "blocked.example" }] },
      history,
      now: new Date("2099-01-01T00:05:00.000Z")
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.ruleResults.find((item) => item.id === "R02")?.passed).toBe(false);
  });

  it("asks for approval above the threshold", () => {
    const result = evaluatePolicy({
      mandate,
      cart: { ...cart, items: [{ ...cart.items[0], unitPrice: 35, quantity: 2 }] },
      history,
      now: new Date("2099-01-01T00:05:00.000Z")
    });

    expect(result.decision).toBe("ASK_HUMAN");
  });
});

describe("combineDecisions", () => {
  it("never lets the reviewer lower severity", () => {
    expect(combineDecisions("BLOCK", "AUTO")).toBe("BLOCK");
    expect(combineDecisions("ASK_HUMAN", "AUTO")).toBe("ASK_HUMAN");
    expect(combineDecisions("AUTO_APPROVE", "BLOCK")).toBe("BLOCK");
  });
});
