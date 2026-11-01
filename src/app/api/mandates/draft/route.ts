import { NextResponse } from "next/server";
import { draftMandateFromIntent, draftMandateWithAi } from "@/core/mandate/parser";
import { useLlm } from "@/core/ai/client";

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
    const draft = useLlm
      ? await draftMandateWithAi(owner, intent)
      : { ...draftMandateFromIntent(owner, intent), source: "fallback" };
    return NextResponse.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mandate draft failed.";
    const fallback = draftMandateFromIntent(owner, intent);
    if (fallback.mandate) {
      return NextResponse.json({ ...fallback, source: "fallback" });
    }
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
