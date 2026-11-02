import { NextResponse } from "next/server";
import { getMandate } from "@/core/domain/store";
import { ownsMandate, requireSessionOwner } from "@/core/auth/session";
import { updateMandateDraft } from "@/core/domain/store";
import { mandateSchema } from "@/core/mandate/schema";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let sessionOwner: string;
  try {
    sessionOwner = requireSessionOwner(request);
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  const mandate = await getMandate(id);
  if (!mandate) return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
  if (!ownsMandate(sessionOwner, mandate.owner)) {
    return NextResponse.json({ error: "Mandate access denied." }, { status: 403 });
  }
  return NextResponse.json({ mandate });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let owner: string;
  try {
    owner = requireSessionOwner(request);
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getMandate(id);
  if (!existing) return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
  if (!ownsMandate(owner, existing.owner)) {
    return NextResponse.json({ error: "Mandate access denied." }, { status: 403 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft mandates can be edited. Amend the mandate to create a new version." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const parsed = mandateSchema.safeParse({
    ...(body as Record<string, unknown>),
    id: existing.id,
    owner: existing.owner,
    status: "DRAFT",
    version: existing.version ?? 1,
    previousVersionId: existing.previousVersionId,
    fingerprint: undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Draft mandate contains invalid fields." }, { status: 422 });
  }

  try {
    const mandate = await updateMandateDraft(parsed.data, owner);
    return mandate
      ? NextResponse.json({ mandate })
      : NextResponse.json({ error: "Draft mandate could not be saved." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Could not save draft mandate." }, { status: 500 });
  }
}
