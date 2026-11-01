import fixtureProducts from "@/core/channel3/fixtures.json";
import type { Product } from "@/core/channel3/types";
import type { Category } from "@/core/policy/types";

export type Channel3Source = "real" | "fixture";

const products = fixtureProducts as Product[];
const cache = new Map<string, { expiresAt: number; products: Product[] }>();
const categories = new Set<Category>([
  "office_supplies",
  "coffee_tea",
  "groceries_pantry",
  "electronics_accessories",
  "books",
  "cleaning_supplies",
  "other"
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, " ");
}

export function sanitizeUntrustedText(value: string, maxLength = 400): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function mapChannel3Product(value: Record<string, unknown>): Product {
  const rawAvailability = String(value.availability ?? value.stock ?? "").toLowerCase();
  const rawCategory = String(value.category ?? "").toLowerCase() as Category;
  return {
    id: String(value.id ?? value.productId ?? `prod_${crypto.randomUUID().slice(0, 8)}`),
    title: sanitizeUntrustedText(String(value.title ?? value.name ?? "Untitled product")),
    description: sanitizeUntrustedText(String(value.description ?? "")),
    merchant: sanitizeUntrustedText(String(value.merchant ?? value.seller ?? "Unknown merchant")),
    price: Number(value.price ?? value.unitPrice ?? 0),
    currency: "USD",
    availability: rawAvailability === "in_stock" || rawAvailability === "in stock" || rawAvailability === "available" ? "in_stock" : "out_of_stock",
    url: String(value.url ?? value.productUrl ?? ""),
    category: categories.has(rawCategory) ? rawCategory : "other"
  };
}

type Channel3Options = {
  apiKey?: string;
  apiUrl?: string;
  fetcher?: typeof fetch;
};

export async function searchProductsWithSource(
  query: string,
  maxPrice?: number,
  options: Channel3Options = {}
): Promise<{ products: Product[]; source: Channel3Source }> {
  const apiKey = options.apiKey ?? process.env.CHANNEL3_API_KEY;
  const apiUrl = options.apiUrl ?? process.env.CHANNEL3_API_URL ?? "https://api.trychannel3.com/v1/products/search";
  if (!apiKey) {
    return { products: searchProducts(query, maxPrice), source: "fixture" };
  }
  const key = `${apiUrl}:${query}:${maxPrice ?? ""}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { products: cached.products, source: "real" };
  }
  try {
    const separator = apiUrl.includes("?") ? "&" : "?";
    const response = await (options.fetcher ?? fetch)(
      `${apiUrl}${separator}q=${encodeURIComponent(query)}${maxPrice === undefined ? "" : `&maxPrice=${maxPrice}`}`,
      {
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: "application/json"
        }
      }
    );
    if (!response.ok) {
      console.warn(`Channel3 API returned ${response.status}, falling back to fixtures.`);
      return { products: searchProducts(query, maxPrice), source: "fixture" };
    }
    const body = await response.json() as { products?: unknown[]; results?: unknown[]; items?: unknown[] };
    const rawList = Array.isArray(body.products)
      ? body.products
      : Array.isArray(body.results)
        ? body.results
        : Array.isArray(body.items)
          ? body.items
          : [];
    const mapped = rawList
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map(mapChannel3Product)
      .filter((product) => product.availability === "in_stock" && (maxPrice === undefined || product.price <= maxPrice));

    if (mapped.length === 0) {
      // Fallback to fixtures if external search returned empty
      return { products: searchProducts(query, maxPrice), source: "fixture" };
    }

    cache.set(key, { products: mapped, expiresAt: Date.now() + 10 * 60 * 1000 });
    return { products: mapped, source: "real" };
  } catch (error) {
    console.warn("Channel3 search failed, using fixtures fallback:", error instanceof Error ? error.message : error);
    return { products: searchProducts(query, maxPrice), source: "fixture" };
  }
}

export function searchProducts(query: string, maxPrice?: number): Product[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return products
    .filter((product) => product.availability === "in_stock")
    .filter((product) => maxPrice === undefined || product.price <= maxPrice)
    .filter((product) => {
      const haystack = normalize(`${product.title} ${product.description} ${product.category}`);
      return terms.length === 0 || terms.some((term) => haystack.includes(term));
    })
    .map((product) => ({
      ...product,
      title: sanitizeUntrustedText(product.title),
      description: sanitizeUntrustedText(product.description)
    }));
}

export function getProduct(productId: string): Product | undefined {
  const product = products.find((item) => item.id === productId);
  return product
    ? {
        ...product,
        title: sanitizeUntrustedText(product.title),
        description: sanitizeUntrustedText(product.description)
      }
    : undefined;
}
