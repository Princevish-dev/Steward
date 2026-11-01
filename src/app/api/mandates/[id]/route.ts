import { NextResponse } from "next/server";
import { getMandate } from "@/core/domain/store";
import { ownsMandate, requireSessionOwner } from "@/core/auth/session";

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
