import { describe, expect, it } from "vitest";
import { trackingRequest } from "@/core/paypal/tracking";

describe("simulated shipment tracking", () => {
  it("uses an explicitly simulated carrier and tracking number", () => {
    expect(trackingRequest("ORDER-1", "run_1")).toMatchObject({
      orderId: "ORDER-1",
      carrier: "SIMULATED_CARRIER",
      trackingNumber: "STEW-run_1"
    });
  });
});
