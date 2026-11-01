import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const runId = url.searchParams.get("runId");
  if (!token) {
    return NextResponse.redirect(new URL("/dashboard?paypal=missing-token", url));
  }
  return NextResponse.redirect(new URL(`/dashboard?paypal=approved&orderId=${encodeURIComponent(token)}${runId ? `&runId=${encodeURIComponent(runId)}` : ""}`, url));
}
