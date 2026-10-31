import { mandateSchema, type Mandate } from "@/core/mandate/schema";

export type MandateDraft = {
  mandate: Mandate | null;
  clarifications: string[];
  refusalReason: string | null;
};

export function parseMandateDraft(input: unknown): MandateDraft {
  if (!input || typeof input !== "object") {
    throw new Error("Mandate parser returned a non-object response.");
  }

  const value = input as Record<string, unknown>;
  const clarifications = Array.isArray(value.clarifications)
    ? value.clarifications.filter((item): item is string => typeof item === "string").slice(0, 3)
    : [];
  const refusalReason = value.refusalReason === null || typeof value.refusalReason === "string"
    ? value.refusalReason
    : null;

  if (refusalReason) {
    return { mandate: null, clarifications, refusalReason };
  }

  const parsed = mandateSchema.safeParse(value.mandate);
  if (!parsed.success) {
    throw new Error(`Invalid mandate draft: ${parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("; ")}`);
  }

  return { mandate: parsed.data, clarifications, refusalReason: null };
}

export function createDemoMandate(owner: string, purpose: string): Mandate {
  return mandateSchema.parse({
    id: `mdt_${crypto.randomUUID()}`,
    owner,
    purpose,
    currency: "USD",
    period: { type: "monthly", budget: 120 },
    caps: { perItem: 40, perTransaction: 80, maxQuantityPerItem: 4 },
    askAbove: 60,
    categories: ["office_supplies", "coffee_tea"],
    merchants: { allow: [], deny: [] },
    velocity: { maxAutoPurchasesPer24h: 2 },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ACTIVE"
  });
}

function amountAfter(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

export function draftMandateFromIntent(owner: string, intent: string): MandateDraft {
  const budget = amountAfter(intent, /max(?:imum)?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(?:a|per)\s*month/i);
  const perItem = amountAfter(intent, /(?:nothing|no item)\s+over\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  const askAbove = amountAfter(intent, /ask\s+me\s+above\s*\$?\s*([\d,]+(?:\.\d+)?)/i);

  if (budget === null) {
    return {
      mandate: null,
      clarifications: ["What monthly spending budget should apply?"],
      refusalReason: null
    };
  }

  const mandate = createDemoMandate(owner, intent);
  return {
    mandate: {
      ...mandate,
      period: { type: "monthly", budget },
      caps: { ...mandate.caps, perItem },
      askAbove
    },
    clarifications: perItem === null ? ["What is the maximum price for one item?"] : [],
    refusalReason: null
  };
}
