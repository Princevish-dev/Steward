import { z } from "zod";

export const categorySchema = z.enum([
  "office_supplies",
  "coffee_tea",
  "groceries_pantry",
  "electronics_accessories",
  "books",
  "cleaning_supplies",
  "other"
]);

export const mandateSchema = z
  .object({
    id: z.string().min(1),
    owner: z.string().email(),
    purpose: z.string().min(1),
    currency: z.literal("USD"),
    period: z.object({
      type: z.literal("monthly"),
      budget: z.number().nonnegative()
    }),
    caps: z.object({
      perItem: z.number().nonnegative().nullable(),
      perTransaction: z.number().nonnegative().nullable(),
      maxQuantityPerItem: z.number().int().positive()
    }),
    askAbove: z.number().nonnegative().nullable(),
    categories: z.array(categorySchema),
    merchants: z.object({
      allow: z.array(z.string()),
      deny: z.array(z.string())
    }),
    velocity: z.object({
      maxAutoPurchasesPer24h: z.number().int().nonnegative()
    }),
    expiresAt: z.string().datetime(),
    status: z.enum(["DRAFT", "ACTIVE", "REVOKED", "EXPIRED"]),
    source: z.enum(["llm", "fallback"]).optional()
  })
  .strict();

export type Mandate = z.infer<typeof mandateSchema>;
