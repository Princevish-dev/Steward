import { paypalRequest } from "@/core/paypal/client";

export type TrackingInput = {
  orderId: string;
  runId: string;
  carrier: string;
  trackingNumber: string;
};

export function trackingRequest(orderId: string, runId: string): TrackingInput {
  return { orderId, runId, carrier: "SIMULATED_CARRIER", trackingNumber: `STEW-${runId}` };
}

export async function addShipmentTracking(orderId: string, runId: string) {
  const input = trackingRequest(orderId, runId);
  await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/track`, {
    method: "POST",
    body: JSON.stringify({
      tracking_number: input.trackingNumber,
      carrier: input.carrier,
      status: "SHIPPED",
      shipment_date: new Date().toISOString().slice(0, 10)
    })
  });
  return { ...input, status: "SHIPPED" as const, simulated: true };
}
