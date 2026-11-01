import { describe, it, expect } from "vitest";
import { draftMandateWithAi, draftMandateFromIntent } from "@/core/mandate/parser";
import { buildCartWithAi, buildCartFromTask } from "@/core/agents/shopper";
import { reviewPurchase } from "@/core/policy/reviewer";
import { createDemoMandate } from "@/core/mandate/parser";
import { useLlm } from "@/core/ai/client";
import * as fs from "node:fs";

describe("Live AI proof verification", () => {
  it.skipIf(!useLlm)("runs real AI calls for parser, shopper, and risk reviewer", async () => {
    console.log("useLlm is:", useLlm);
    expect(useLlm).toBe(true);

    const metrics: Array<{
      Agent: string;
      Model: string;
      LatencyMs: number;
      InputTokens: number;
      OutputTokens: number;
      CostUSD: string;
    }> = [];

    // 1. Mandate Parser
    const mandateIntent = "Reorder printer paper and coffee for my studio; max $120 a month; nothing over $40 per item; ask me above $60";
    const mandateDraft = await draftMandateWithAi("owner@example.com", mandateIntent);
    expect(mandateDraft.source).toBe("llm");
    expect(mandateDraft.mandate).not.toBeNull();
    expect(mandateDraft.ai).toBeDefined();

    metrics.push({
      Agent: "Mandate Parser",
      Model: mandateDraft.ai!.model,
      LatencyMs: mandateDraft.ai!.latencyMs,
      InputTokens: mandateDraft.ai!.inputTokens ?? 0,
      OutputTokens: mandateDraft.ai!.outputTokens ?? 0,
      CostUSD: `$${(mandateDraft.ai!.costUsd ?? 0).toFixed(6)}`
    });

    // 2. Shopper Agent
    const activeMandate = { ...mandateDraft.mandate!, status: "ACTIVE" as const };
    const shopperResult = await buildCartWithAi("Order A4 printer paper and medium roast coffee", activeMandate);
    expect(shopperResult.source).toBe("llm");
    expect(shopperResult.cart.items.length).toBeGreaterThan(0);
    expect(shopperResult.ai).toBeDefined();

    metrics.push({
      Agent: "Shopper Agent",
      Model: shopperResult.ai!.model,
      LatencyMs: shopperResult.ai!.latencyMs,
      InputTokens: shopperResult.ai!.inputTokens ?? 0,
      OutputTokens: shopperResult.ai!.outputTokens ?? 0,
      CostUSD: `$${(shopperResult.ai!.costUsd ?? 0).toFixed(6)}`
    });

    // 3. Risk Reviewer
    const reviewResult = await reviewPurchase({
      mandate: activeMandate,
      cart: shopperResult.cart,
      policyDecision: "AUTO_APPROVE",
      ruleResults: [
        { id: "R01", passed: true, outcome: "BLOCK", reason: "Mandate ACTIVE" },
        { id: "R04", passed: true, outcome: "BLOCK", reason: "Item price under cap" },
        { id: "R05", passed: true, outcome: "BLOCK", reason: "Cart total under cap" }
      ],
      flags: shopperResult.flags.map(f => f.code),
      history: { spentInPeriod: 0, autoPurchasesLast24h: 0, merchantsPurchasedUnderMandate: [] }
    });
    expect(reviewResult.source).toBe("llm");
    expect(reviewResult.ai).toBeDefined();
    expect(reviewResult.rationale.length).toBeGreaterThan(0);

    metrics.push({
      Agent: "Risk Reviewer",
      Model: reviewResult.ai!.model,
      LatencyMs: reviewResult.ai!.latencyMs,
      InputTokens: reviewResult.ai!.inputTokens ?? 0,
      OutputTokens: reviewResult.ai!.outputTokens ?? 0,
      CostUSD: `$${(reviewResult.ai!.costUsd ?? 0).toFixed(6)}`
    });

    console.log("\n=== LIVE AI PROOF METRICS TABLE ===");
    console.table(metrics);

    // Save metrics for README table
    fs.mkdirSync("docs", { recursive: true });
    fs.writeFileSync("docs/ai-proof-metrics.json", JSON.stringify(metrics, null, 2));
  }, 120_000);

  it("ensures fallbacks work deterministically when LLM fails or is disabled", async () => {
    // 1. Mandate Parser Fallback
    const intent = "Reorder printer paper; max $120 a month; nothing over $40 per item";
    const fallbackDraft = await draftMandateWithAi("owner@example.com", intent, async () => {
      throw new Error("Simulated LLM outage");
    });
    expect(fallbackDraft.source).toBe("fallback");
    expect(fallbackDraft.mandate).not.toBeNull();
    expect(fallbackDraft.mandate?.period.budget).toBe(120);

    // 2. Shopper Agent Fallback
    const mandate = createDemoMandate("owner@example.com", intent);
    const fallbackShopper = await buildCartWithAi("A4 paper", mandate, async () => {
      throw new Error("Simulated LLM outage");
    });
    expect(fallbackShopper.source).toBe("fallback");
    expect(fallbackShopper.cart.items.length).toBeGreaterThan(0);

    // 3. Risk Reviewer Fallback
    const fallbackReview = await reviewPurchase({
      mandate,
      cart: fallbackShopper.cart,
      policyDecision: "AUTO_APPROVE",
      ruleResults: [{ id: "R01", passed: true, outcome: "BLOCK", reason: "Mandate ACTIVE" }],
      flags: [],
      history: { spentInPeriod: 0, autoPurchasesLast24h: 0, merchantsPurchasedUnderMandate: [] },
      generator: async () => { throw new Error("Simulated LLM outage"); }
    });
    expect(fallbackReview.source).toBe("fallback");
    expect(fallbackReview.decision).toBe("ASK_HUMAN");
  });
});
