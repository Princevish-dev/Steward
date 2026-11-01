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
  return { ...input, status: "SHIPPED" as const, simulated: true };
}
