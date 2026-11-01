import { NextResponse } from "next/server";
import { processWebhookEvent } from "@/core/paypal/webhook";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Simulation is disabled in production." }, { status: 404 });
  const body = await request.json().catch(() => null) as { runId?: unknown } | null;
  const event = {
    id: `simulated-dispute-${crypto.randomUUID()}`,
    event_type: "CUSTOMER.DISPUTE.CREATED",
    resource: { id: typeof body?.runId === "string" ? body.runId : "not available" }
  };
  return NextResponse.json(await processWebhookEvent(event, true));
}
