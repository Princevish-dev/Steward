import { describe, expect, it } from "vitest";
import { z } from "zod";
import { combineDecisions } from "@/core/policy/engine";
import { mandateAiOutputSchema, reviewerAiOutputSchema, cartAiOutputSchema } from "@/core/ai/schemas";
import {
  NEMOTRON_MODEL,
  stripReasoningTokens,
  extractJsonFromModelOutput,
  createNvidiaFetch,
  getModel,
  generateAiObject
} from "@/core/ai/client";
import { draftMandateWithAi, parseMandateDraft, extractMandateAiOutput } from "@/core/mandate/parser";
import { buildCartWithAi } from "@/core/agents/shopper";
import { reviewPurchase } from "@/core/policy/reviewer";
import { createDemoMandate } from "@/core/mandate/parser";

describe("AI safety contracts & NVIDIA Nemotron reasoning integration", () => {
  it("uses the correct NVIDIA Nemotron 3 Ultra 550B model identifier", () => {
    expect(NEMOTRON_MODEL).toBe("nvidia/nemotron-3-ultra-550b-a55b");
  });

  it("rejects malformed structured output", () => {
    expect(() => mandateAiOutputSchema.parse({ mandate: {}, clarifications: [], refusalReason: null })).toThrow();
    expect(() => reviewerAiOutputSchema.parse({ recommend: "approve" })).toThrow();
  });

  it("never lets an AI reviewer approve a blocked policy (escalate-only invariant)", () => {
    expect(combineDecisions("BLOCK", "AUTO")).toBe("BLOCK");
    expect(combineDecisions("BLOCK", "ASK")).toBe("BLOCK");
    expect(combineDecisions("ASK_HUMAN", "AUTO")).toBe("ASK_HUMAN");
    expect(combineDecisions("ASK_HUMAN", "BLOCK")).toBe("BLOCK");
  });

  describe("Reasoning token stripping & JSON extraction", () => {
    it("strips <think>...</think> reasoning tags and markdown codeblocks", () => {
      const outputWithThink = "<think>Let me analyze the budget cap of $120.</think>{\"valid\":true}";
      expect(stripReasoningTokens(outputWithThink)).toBe("{\"valid\":true}");

      const outputWithMarkdown = "<think>Calculating...</think>```json\n{\"amount\": 50}\n```";
      expect(stripReasoningTokens(outputWithMarkdown)).toBe("{\"amount\": 50}");

      const outputWithBracketThink = "[THINK]Internal chain of thought[/THINK]{\"status\":\"OK\"}";
      expect(stripReasoningTokens(outputWithBracketThink)).toBe("{\"status\":\"OK\"}");
    });

    it("extracts and parses valid Zod objects despite surrounding reasoning text", () => {
      const schema = z.object({
        recommend: z.enum(["AUTO", "ASK", "BLOCK"]),
        confidence: z.number()
      });

      const raw = "<think>The merchant is trusted and cart is within limits</think>{\"recommend\":\"AUTO\",\"confidence\":0.95}";
      const parsed = extractJsonFromModelOutput(raw, schema);
      expect(parsed).toEqual({ recommend: "AUTO", confidence: 0.95 });
    });

    it("extracts mandate output using extractMandateAiOutput even with leading thoughts and trailing text", () => {
      const complexOutput = `<think>
        The user wants office supplies.
        Monthly limit is $150.
        Per item is $30.
      </think>
      Sure! Here is the structured mandate draft:
      \`\`\`json
      {
        "mandate": null,
        "clarifications": ["What is your approval threshold?"],
        "refusalReason": null
      }
      \`\`\`
      Let me know if you would like to adjust the limits.`;

      const extracted = extractMandateAiOutput(complexOutput);
      expect(extracted.clarifications).toContain("What is your approval threshold?");
      expect(extracted.mandate).toBeNull();
      expect(extracted.refusalReason).toBeNull();
    });

    it("parses mandate draft from string with thinking tokens", () => {
      const rawDraft = `<think>User wants office supplies with $100 budget</think>
      {
        "mandate": null,
        "clarifications": ["What is your max per item?"],
        "refusalReason": null
      }`;
      const draft = parseMandateDraft(rawDraft);
      expect(draft.clarifications).toContain("What is your max per item?");
    });
  });

  describe("NVIDIA NIM custom fetch & thinking configuration", () => {
    it("translates chat_template_kwargs enable_thinking into request body", async () => {
      let interceptedBody: Record<string, unknown> | null = null;

      const mockFetch: typeof fetch = async (_input, init) => {
        interceptedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({
          id: "chatcmpl-test",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: "<think>Thinking active</think>{\"success\":true}"
            }
          }],
          usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      };

      const customFetch = createNvidiaFetch(mockFetch);
      const res = await customFetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b",
          messages: [{ role: "user", content: "Test" }]
        })
      });

      expect(interceptedBody).not.toBeNull();
      // Verifies Python extra_body={"chat_template_kwargs":{"enable_thinking":True}} translation
      expect((interceptedBody as any).chat_template_kwargs).toEqual({ enable_thinking: true });
      expect((interceptedBody as any).extra_body?.chat_template_kwargs).toEqual({ enable_thinking: true });

      // Verifies response interception strips <think> tags for clean downstream JSON consumption
      const responseData = await res.json();
      expect(responseData.choices[0].message.content).toBe("{\"success\":true}");
    });

    it("specifically disables enable_thinking when x-enable-thinking: false header is passed", async () => {
      let interceptedBody: Record<string, unknown> | null = null;

      const mockFetch: typeof fetch = async (_input, init) => {
        interceptedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({
          id: "chatcmpl-test-2",
          choices: [{
            index: 0,
            message: { role: "assistant", content: "{\"mandate\":null,\"clarifications\":[],\"refusalReason\":null}" }
          }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      };

      const customFetch = createNvidiaFetch(mockFetch);
      await customFetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "x-enable-thinking": "false" },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b",
          messages: [{ role: "user", content: "Draft mandate" }]
        })
      });

      expect(interceptedBody).not.toBeNull();
      // Verifies enable_thinking is specifically false for structured parsing
      expect((interceptedBody as any).chat_template_kwargs?.enable_thinking).toBe(false);
      expect((interceptedBody as any).extra_body?.chat_template_kwargs?.enable_thinking).toBe(false);
    });
  });

  describe("Agent Model Instantiation with Nemotron", () => {
    it("instantiates Parser with Nemotron model and handles reasoning responses", async () => {
      const mockGenerator = async ({ model, schema }: any) => {
        expect(model).toBe(NEMOTRON_MODEL);
        const validOutput = {
          mandate: null,
          clarifications: ["Specify the per-item limit."],
          refusalReason: null
        };
        return {
          object: schema.parse(validOutput),
          meta: { model, latencyMs: 42, inputTokens: 50, outputTokens: 30, costUsd: 0.0001 }
        };
      };

      const result = await draftMandateWithAi("alice@example.com", "Buy notebooks up to $100", mockGenerator);
      expect(result.source).toBe("llm");
      expect(result.ai?.model).toBe(NEMOTRON_MODEL);
    });

    it("instantiates Shopper with Nemotron model", async () => {
      const mandate = createDemoMandate("alice@example.com", "Office supplies");
      const mockGenerator = async ({ model, schema }: any) => {
        expect(model).toBe(NEMOTRON_MODEL);
        const validOutput = {
          queries: ["paper"],
          cart: { items: [{ productId: "paper-a4-001", qty: 2 }] },
          flags: []
        };
        return {
          object: schema.parse(validOutput),
          meta: { model, latencyMs: 55, inputTokens: 60, outputTokens: 40, costUsd: 0.00015 }
        };
      };

      const result = await buildCartWithAi("Order paper", mandate, mockGenerator);
      expect(result.source).toBe("llm");
      expect(result.ai?.model).toBe(NEMOTRON_MODEL);
    });

    it("instantiates Reviewer with Nemotron model and enforces policy boundary", async () => {
      const mandate = createDemoMandate("alice@example.com", "Office supplies");
      const mockGenerator = async ({ model, schema }: any) => {
        expect(model).toBe(NEMOTRON_MODEL);
        const validOutput = {
          recommend: "AUTO" as const,
          riskFlags: [],
          rationale: "All items within allowed categories and caps.",
          confidence: 0.98
        };
        return {
          object: schema.parse(validOutput),
          meta: { model, latencyMs: 38, inputTokens: 45, outputTokens: 25, costUsd: 0.00009 }
        };
      };

      const result = await reviewPurchase({
        mandate,
        cart: { items: [] },
        policyDecision: "AUTO_APPROVE",
        ruleResults: [{ id: "R01", passed: true, outcome: "BLOCK", reason: "Mandate is active" }],
        flags: [],
        history: { spentInPeriod: 0, autoPurchasesLast24h: 0, merchantsPurchasedUnderMandate: [] },
        generator: mockGenerator
      });

      expect(result.source).toBe("llm");
      expect(result.ai?.model).toBe(NEMOTRON_MODEL);
      expect(result.decision).toBe("AUTO_APPROVE");
    });
  });

  describe("getModel fallback & instantiation", () => {
    it("returns language model instance for nemotron", () => {
      const model = getModel(NEMOTRON_MODEL);
      expect(model).toBeDefined();
      expect((model as any).modelId).toBe(NEMOTRON_MODEL);
    });
  });
});
