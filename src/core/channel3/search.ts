import fixtureProducts from "@/core/channel3/fixtures.json";
import type { Product } from "@/core/channel3/types";

const products = fixtureProducts as Product[];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, " ");
}

export function sanitizeUntrustedText(value: string, maxLength = 400): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
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
