import { NextResponse } from "next/server";
import { draftMandateFromIntent } from "@/core/mandate/parser";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { owner, intent } = body as { owner?: unknown; intent?: unknown };
  if (typeof owner !== "string" || typeof intent !== "string" || !owner || !intent) {
    return NextResponse.json({ error: "owner and intent are required." }, { status: 422 });
  }

  try {
    return NextResponse.json(draftMandateFromIntent(owner, intent));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mandate draft failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
