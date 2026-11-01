import { createHash } from "node:crypto";
import { canonicalJson } from "@/core/ledger/canonical";

type CartIdentity = {
  mandateId: string;
  currency: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; stockConfirmedAt?: string }>;
};

export function cartHash(input: CartIdentity): string {
  return createHash("sha256").update(canonicalJson({
    mandateId: input.mandateId,
    currency: input.currency,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }))
  })).digest("hex");
}

export function paymentIdempotencyKey(runId: string, hash: string): string {
  return createHash("sha256").update(`${runId}${hash}`).digest("hex");
}
