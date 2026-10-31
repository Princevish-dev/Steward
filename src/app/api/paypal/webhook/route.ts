import { NextResponse } from "next/server";
import { paypalRequest } from "@/core/paypal/client";
import { persistDispute } from "@/core/domain/store";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Webhook body must be valid JSON." }, { status: 400 });
  }
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  if (!webhookId || !transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return NextResponse.json({ error: "PayPal webhook verification configuration or headers are missing." }, { status: 400 });
  }
  try {
    const verification = await paypalRequest<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event
      })
    });
    if (verification.verification_status !== "SUCCESS") {
      return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
    }
    const value = event as { id?: unknown; event_type?: unknown; resource?: { id?: unknown; dispute_id?: unknown } };
    const eventType = typeof value.event_type === "string" ? value.event_type : "UNKNOWN";
    if (eventType.startsWith("CUSTOMER.DISPUTE") || eventType.startsWith("PAYMENT.CAPTURE.REVERSED")) {
      await persistDispute({
        id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
        orderId: typeof value.resource?.id === "string" ? value.resource.id : undefined,
        status: eventType,
        payload: event
      });
    }
    return NextResponse.json({ accepted: true, eventType });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 502 });
  }
}
