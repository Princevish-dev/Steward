import { NextResponse } from "next/server";
import { createDemoMandate, draftMandateFromIntent } from "@/core/mandate/parser";
import { createMandate } from "@/core/domain/store";
import { createSessionToken, sessionCookie } from "@/core/auth/session";
import { mandateSchema, type Mandate } from "@/core/mandate/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { owner?: unknown; intent?: unknown; mandate?: unknown } | null;
  if (!body || typeof body.owner !== "string" || typeof body.intent !== "string") {
    return NextResponse.json({ error: "owner and intent are required." }, { status: 422 });
  }
  try {
    let mandate: Mandate;
    if (body.mandate && typeof body.mandate === "object") {
      const parsed = mandateSchema.safeParse({
        ...createDemoMandate(body.owner, body.intent),
        ...body.mandate,
        id: `mdt_${crypto.randomUUID()}`,
        owner: body.owner,
        purpose: body.intent,
        currency: "USD",
        status: "DRAFT"
      });
      if (!parsed.success) {
        return NextResponse.json({ error: `Invalid custom mandate: ${parsed.error.issues[0]?.message}` }, { status: 422 });
      }
      mandate = parsed.data;
    } else {
      const parsedDraft = draftMandateFromIntent(body.owner, body.intent);
      mandate = parsedDraft.mandate ?? createDemoMandate(body.owner, body.intent);
    }

    await createMandate(mandate);
    const response = NextResponse.json({ mandate }, { status: 201 });
    // Update or establish the owner's authenticated session cookie
    response.cookies.set(sessionCookie(createSessionToken(body.owner)));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mandate creation failed." }, { status: 422 });
  }
}
