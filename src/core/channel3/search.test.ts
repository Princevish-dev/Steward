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

  it("caches API responses for ten minutes", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ products: [{
      id: "real-2", title: "Coffee", description: "", merchant: "m", price: 5,
      availability: "in_stock", url: "https://m/coffee", category: "coffee_tea"
    }] }), { status: 200 }));
    const first = await searchProductsWithSource("coffee", undefined, { apiKey: "key", apiUrl: "https://channel3.test/search", fetcher });
    const second = await searchProductsWithSource("coffee", undefined, { apiKey: "key", apiUrl: "https://channel3.test/search", fetcher });
    expect(first.source).toBe("real");
    expect(second.products).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
