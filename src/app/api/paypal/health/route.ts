import { NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalConfig } from "@/core/paypal/client";

export async function GET() {
  try {
    const config = getPayPalConfig();
    await getPayPalAccessToken(config);
    return NextResponse.json({ connected: true, environment: config.environment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal connection failed.";
    return NextResponse.json({ connected: false, error: message }, { status: 502 });
  }
}
