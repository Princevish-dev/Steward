import { NextResponse } from "next/server";
import { createMandateApiKey } from "@/core/mcp/keys";
import { getMandate, listMandateApiKeysForOwner } from "@/core/domain/store";
import { requireSessionOwner, ownsMandate } from "@/core/auth/session";
import { rateLimit } from "@/core/http/rate-limit";

export async function GET(request: Request) {
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  try {
    const keys = await listMandateApiKeysForOwner(owner);
    return NextResponse.json({ keys: keys.map((k) => ({
      id: k.id,
      mandateId: k.mandate_id,
      keyPrefix: k.key_prefix,
      createdAt: k.created_at,
      revokedAt: k.revoked_at
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list API keys." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "mcp-keys");
  if (limited) return limited;
  let owner: string;
  try { owner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const body = await request.json().catch(() => null) as { mandateId?: unknown } | null;
  if (!body || typeof body.mandateId !== "string" || !body.mandateId) {
    return NextResponse.json({ error: "mandateId is required." }, { status: 422 });
  }
  const mandate = await getMandate(body.mandateId);
  if (!mandate) return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
  if (!ownsMandate(owner, mandate.owner)) return NextResponse.json({ error: "Mandate access denied." }, { status: 403 });
  return NextResponse.json(await createMandateApiKey(body.mandateId), { status: 201 });
}
