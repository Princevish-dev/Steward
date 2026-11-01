import { z } from "zod";
import { generateAiObject, type AiCallMeta, type AiObjectGenerator } from "@/core/ai/client";

export const disputeAdvocateSchema = z.object({
  summary: z.string(),
  timeline: z.array(z.string()),
  authorization: z.string(),
  delivery: z.string(),
  recommendation: z.enum(["RESPOND_WITH_EVIDENCE", "OFFER_REFUND", "ACCEPT_CLAIM"]),
  reason: z.string()
});

export type DisputeAdvocateDraft = z.infer<typeof disputeAdvocateSchema> & {
  source: "llm" | "fallback";
  ai?: AiCallMeta;
};

const A4 = `You draft a factual evidence summary for a PayPal dispute. Use ONLY the supplied ledger excerpt,
order, tracking, and mandate. If a fact is absent, write "not available" and do not guess.
Return JSON with summary, timeline, authorization, delivery, recommendation, and reason. Keep it under 250 words.`;

export function templateDisputeDraft(input: { mandateId?: string; orderId?: string; decision?: string; tracking?: string }): DisputeAdvocateDraft {
  return {
    summary: `Order ${input.orderId ?? "not available"} dispute evidence is being reviewed.`,
    timeline: ["not available"],
    authorization: `Mandate ${input.mandateId ?? "not available"}; decision ${input.decision ?? "not available"}.`,
    delivery: input.tracking ?? "not available",
    recommendation: "ACCEPT_CLAIM",
    reason: "not available",
    source: "fallback"
  };
}

export async function createDisputeDraft(input: {
  mandate: unknown;
  order: unknown;
  tracking: unknown;
  ledger: unknown;
  generator?: AiObjectGenerator;
}): Promise<DisputeAdvocateDraft> {
  try {
    const result = await (input.generator ?? generateAiObject)({
      schema: disputeAdvocateSchema,
      system: A4,
      prompt: `MANDATE: ${JSON.stringify(input.mandate)}\nORDER: ${JSON.stringify(input.order)}\nTRACKING: ${JSON.stringify(input.tracking)}\nLEDGER_EXCERPT: ${JSON.stringify(input.ledger)}`,
      timeoutMs: 15_000
    });
    return { ...result.object, source: "llm", ai: result.meta };
  } catch {
    return templateDisputeDraft({
      mandateId: (input.mandate as { id?: string } | null)?.id,
      orderId: (input.order as { id?: string } | null)?.id,
      tracking: input.tracking ? JSON.stringify(input.tracking) : undefined
    });
  }
}
