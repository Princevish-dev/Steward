import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/paypal/webhook/route";

describe("PayPal webhook boundary", () => {
  it("rejects unsigned requests before processing", async () => {
    const response = await POST(new Request("http://localhost/api/paypal/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt-1", event_type: "CUSTOMER.DISPUTE.CREATED" })
    }));
    expect(response.status).toBe(400);
  });
});
