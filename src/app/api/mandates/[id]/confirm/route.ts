import { NextResponse } from "next/server";
import { setMandateStatus } from "@/core/domain/store";
import { getMandate } from "@/core/domain/store";
import { requireSessionOwner, ownsMandate } from "@/core/auth/session";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let owner: string;
  try { owner = requireSessionOwner(_request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const existing = await getMandate(id);
  if (!existing) return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
  if (!ownsMandate(owner, existing.owner)) return NextResponse.json({ error: "Mandate access denied." }, { status: 403 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Active mandates must be amended into a new version before changes can be confirmed." }, { status: 409 });
  }
  const mandate = await setMandateStatus(id, "ACTIVE");
  return mandate
    ? NextResponse.json({ mandate })
    : NextResponse.json({ error: "Mandate not found." }, { status: 404 });
}
