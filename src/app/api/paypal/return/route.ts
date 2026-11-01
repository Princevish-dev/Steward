import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/core/http/public-url";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const token = query.get("token");
  const runId = query.get("runId");
  const baseUrl = getPublicBaseUrl(request);
  if (!token) {
    return NextResponse.redirect(`${baseUrl}/dashboard?paypal=missing-token`);
  }
  return NextResponse.redirect(`${baseUrl}/dashboard?paypal=approved&orderId=${encodeURIComponent(token)}${runId ? `&runId=${encodeURIComponent(runId)}` : ""}`);
}
