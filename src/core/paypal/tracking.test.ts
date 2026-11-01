import { describe, expect, it } from "vitest";
import { addShipmentTracking, trackingRequest } from "@/core/paypal/tracking";

describe("simulated shipment tracking", () => {
  it("uses an explicitly simulated carrier and tracking number", () => {
    expect(trackingRequest("ORDER-1", "run_1")).toMatchObject({
      orderId: "ORDER-1",
      carrier: "SIMULATED_CARRIER",
      trackingNumber: "STEW-run_1"
    });
  });

  it("does not call PayPal for simulated tracking", async () => {
    await expect(addShipmentTracking("ORDER-1", "run_1")).resolves.toMatchObject({
      status: "SHIPPED",
      simulated: true
    });
  });
});
