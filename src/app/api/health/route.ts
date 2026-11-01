import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "steward", environment: process.env.PAYPAL_ENVIRONMENT ?? "SANDBOX" });
}
