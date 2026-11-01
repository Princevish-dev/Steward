import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/openapi/route";

describe("OpenAPI 3.1.0 specification endpoint", () => {
  it("returns openapi 3.1.0 and documents all core paths", async () => {
    const response = await GET(new Request("http://localhost:3000/api/openapi"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/api/ledger/export"]).toBeDefined();
    expect(body.paths["/api/runs"]).toBeDefined();
    expect(body.paths["/api/paypal/orders"]).toBeDefined();
    expect(body.paths["/api/paypal/capture"]).toBeDefined();
    expect(body.paths["/api/paypal/refund"]).toBeDefined();
    expect(body.paths["/api/mcp"]).toBeDefined();
    expect(body.paths["/api/mcp/keys"]).toBeDefined();
    expect(body.paths["/api/disputes/advocate"]).toBeDefined();
  });
});
