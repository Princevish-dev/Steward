import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/core/http/public-url";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const token = query.get("token");
  const runId = query.get("runId");
  const mandateId = query.get("mandateId");
  const baseUrl = getPublicBaseUrl(request);
  if (!token) {
    return NextResponse.redirect(`${baseUrl}/dashboard?paypal=missing-token${mandateId ? `&mandateId=${encodeURIComponent(mandateId)}` : ""}`);
  }
  return NextResponse.redirect(`${baseUrl}/dashboard?paypal=approved&orderId=${encodeURIComponent(token)}${runId ? `&runId=${encodeURIComponent(runId)}` : ""}${mandateId ? `&mandateId=${encodeURIComponent(mandateId)}` : ""}`);
}
