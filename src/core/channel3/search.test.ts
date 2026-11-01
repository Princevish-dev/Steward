import { describe, expect, it, vi } from "vitest";
import { mapChannel3Product, searchProductsWithSource } from "@/core/channel3/search";

describe("Channel3 integration", () => {
  it("maps unknown categories to other and sanitizes text", () => {
    const product = mapChannel3Product({
      id: "real-1", title: "<b>Paper</b>", description: "<script>ignore</script>",
      merchant: "merchant.example", price: "4.50", availability: "IN_STOCK",
      url: "https://merchant.example/paper", category: "stationery"
    });
    expect(product).toMatchObject({ id: "real-1", title: "Paper", price: 4.5, category: "other", availability: "in_stock" });
    expect(product.description).not.toContain("<script>");
  });

  it("maps the documented product and offer response", () => {
    const product = mapChannel3Product({
      id: "real-3",
      title: "<b>USB Hub</b>",
      description: null,
      category: { slug: "electronics_accessories", title: "Accessories" },
      offers: [{
        url: "https://merchant.example/usb-hub",
        domain: "merchant.example",
        price: { price: 12.5, currency: "USD" },
        availability: "InStock"
      }]
    });
    expect(product).toMatchObject({
      id: "real-3",
      title: "USB Hub",
      merchant: "merchant.example",
      price: 12.5,
      currency: "USD",
      availability: "in_stock",
      url: "https://merchant.example/usb-hub",
      category: "electronics_accessories"
    });
  });

  it("caches API responses for ten minutes", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("x-api-key")).toBe("key");
      expect(JSON.parse(String(init?.body))).toMatchObject({ query: "coffee", limit: 20 });
      return new Response(JSON.stringify({ products: [{
        id: "real-2", title: "Coffee", description: "", category: { slug: "coffee_tea" },
        offers: [{
          url: "https://m/coffee", domain: "m", price: { price: 5, currency: "USD" },
          availability: "InStock"
        }]
      }] }), { status: 200 });
    });
    const first = await searchProductsWithSource("coffee", undefined, { apiKey: "key", apiUrl: "https://channel3.test/v1", fetcher });
    const second = await searchProductsWithSource("coffee", undefined, { apiKey: "key", apiUrl: "https://channel3.test/v1", fetcher });
    expect(first.source).toBe("real");
    expect(second.products).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
