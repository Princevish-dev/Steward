import { claimWebhookEvent, persistDispute } from "@/core/domain/store";
import { recordLedgerEvent } from "@/core/ledger/store";

export type PayPalEvent = {
  id?: unknown;
  event_type?: unknown;
  resource?: { id?: unknown; dispute_id?: unknown; status?: unknown };
};

export async function processWebhookEvent(event: PayPalEvent, simulated = false) {
  const eventId = typeof event.id === "string" ? event.id : crypto.randomUUID();
  const eventType = typeof event.event_type === "string" ? event.event_type : "UNKNOWN";
  if (!await claimWebhookEvent(eventId, eventType, event)) return { accepted: true, duplicate: true, eventType };
  await recordLedgerEvent({ type: "WEBHOOK_RECEIVED", runId: "webhook", mandateId: "system", payload: { eventId, eventType, simulated } });
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    await recordLedgerEvent({
      type: "ORDER_CAPTURED",
      runId: "webhook",
      mandateId: "system",
      payload: { eventId, captureId: event.resource?.id ?? null, status: event.resource?.status ?? "COMPLETED", simulated }
    });
  } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
    await recordLedgerEvent({
      type: "REFUND_ISSUED",
      runId: "webhook",
      mandateId: "system",
      payload: { eventId, captureId: event.resource?.id ?? null, status: event.resource?.status ?? "REFUNDED", simulated }
    });
  } else if (eventType === "CUSTOMER.DISPUTE.CREATED") {
    await persistDispute({ id: eventId, orderId: typeof event.resource?.id === "string" ? event.resource.id : undefined, status: eventType, payload: event });
    await recordLedgerEvent({ type: "DISPUTE_OPENED", runId: "webhook", mandateId: "system", payload: { eventId, orderId: event.resource?.id ?? null, eventType, simulated } });
  }
  return { accepted: true, duplicate: false, eventType, simulated };
}
