import { z } from "zod";
import { mandateSchema } from "@/core/mandate/schema";

export const mandateAiOutputSchema = z.object({
  mandate: mandateSchema.nullable(),
  clarifications: z.array(z.string()).max(3),
  refusalReason: z.string().nullable()
});

export const cartAiOutputSchema = z.object({
  queries: z.array(z.string()).max(3),
  cart: z.object({
    items: z.array(z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
      reason: z.string().optional()
    })).max(4)
  }),
  flags: z.array(z.object({
    flag: z.literal("INSTRUCTION_IN_DATA"),
    quote: z.string().max(100)
  }))
});

export const reviewerAiOutputSchema = z.object({
  recommend: z.enum(["AUTO", "ASK", "BLOCK"]),
  riskFlags: z.array(z.object({
    code: z.string(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    evidence: z.string()
  })),
  rationale: z.string().max(500),
  confidence: z.number().min(0).max(1)
});

export type MandateAiOutput = z.infer<typeof mandateAiOutputSchema>;
export type CartAiOutput = z.infer<typeof cartAiOutputSchema>;
export type ReviewerAiOutput = z.infer<typeof reviewerAiOutputSchema>;
