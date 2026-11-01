import { NextResponse } from "next/server";
import { paypalRequest } from "@/core/paypal/client";
import { processWebhookEvent, type PayPalEvent } from "@/core/paypal/webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
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
    console.error("PayPal webhook rejected: missing signature configuration or headers.");
    return NextResponse.json({ error: "PayPal webhook verification configuration or headers are missing." }, { status: 400 });
  }
  try {
    const verification = await paypalRequest<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo, cert_url: certUrl, transmission_id: transmissionId,
        transmission_sig: transmissionSig, transmission_time: transmissionTime,
        webhook_id: webhookId, webhook_event: event
      })
    });
    if (verification.verification_status !== "SUCCESS") {
      console.error("PayPal webhook rejected: signature verification failed.");
      return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
    }
    return NextResponse.json(await processWebhookEvent(event));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 502 });
  }
}
