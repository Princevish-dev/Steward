import type { Product } from "@/core/channel3/types";
import type { Mandate } from "@/core/mandate/schema";
import type { Cart } from "@/core/policy/types";
import { getProduct, searchProducts, sanitizeUntrustedText } from "@/core/channel3/search";

export type ShopperResult = {
  queries: string[];
  cart: Cart;
  flags: Array<{ code: "INSTRUCTION_IN_DATA"; quote: string }>;
};

function containsInjection(text: string): boolean {
  return /\b(?:system|assistant|ignore previous|set .*cap|buy \d+|pay immediately)\b/i.test(text);
}

export function buildCartFromTask(task: string, mandate: Mandate): ShopperResult {
  const flags: ShopperResult["flags"] = [];
  const queries = task
    .split(/\band\b|[,;]/i)
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, 3);
  const selected: Product[] = [];

  for (const query of queries) {
    const matches = searchProducts(query, mandate.caps.perItem ?? undefined);
    const product = matches.find((item) => mandate.categories.includes(item.category));
    if (!product) continue;

    const untrusted = `${product.title} ${product.description}`;
    if (containsInjection(untrusted)) {
      flags.push({
        code: "INSTRUCTION_IN_DATA",
        quote: sanitizeUntrustedText(untrusted, 100)
      });
      continue;
    }
    selected.push(product);
  }

  const items = selected.slice(0, 4).map((product) => ({
    productId: product.id,
    title: product.title,
    merchant: product.merchant,
    category: product.category,
    unitPrice: product.price,
    quotedUnitPrice: product.price,
    quantity: 1,
    currency: product.currency,
    stockConfirmedAt: new Date().toISOString()
  }));

  return { queries, cart: { items }, flags };
}

export function buildCartFromProductIds(productIds: string[], mandate: Mandate): ShopperResult {
  const flags: ShopperResult["flags"] = [];
  const items = productIds.slice(0, 4).flatMap((productId) => {
    const product = getProduct(productId);
    if (!product || !mandate.categories.includes(product.category)) return [];
    if (containsInjection(`${product.title} ${product.description}`)) {
      flags.push({
        code: "INSTRUCTION_IN_DATA",
        quote: sanitizeUntrustedText(`${product.title} ${product.description}`, 100)
      });
      return [];
    }
    return [{
      productId: product.id,
      title: product.title,
      merchant: product.merchant,
      category: product.category,
      unitPrice: product.price,
      quotedUnitPrice: product.price,
      quantity: 1,
      currency: product.currency,
      stockConfirmedAt: new Date().toISOString()
    }];
  });
  return { queries: [], cart: { items }, flags };
}
