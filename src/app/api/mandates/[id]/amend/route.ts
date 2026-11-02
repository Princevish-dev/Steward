import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ownsMandate, requireSessionOwner } from "@/core/auth/session";
import { createMandate, getMandate } from "@/core/domain/store";
import { recordLedgerEvent } from "@/core/ledger/store";
import type { Mandate } from "@/core/mandate/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let owner: string;
  try {
    owner = requireSessionOwner(request);
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const existing = await getMandate(id);
    if (!existing) return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
    if (!ownsMandate(owner, existing.owner)) {
      return NextResponse.json({ error: "Mandate access denied." }, { status: 403 });
    }

    const mandate: Mandate = {
      ...existing,
      id: `mdt_${randomUUID()}`,
      status: "DRAFT",
      version: (existing.version ?? 1) + 1,
      previousVersionId: existing.id
    };
    delete mandate.fingerprint;

    await createMandate(mandate, owner);
    await recordLedgerEvent({
      type: "MANDATE_VERSION_CREATED",
      runId: "system",
      mandateId: mandate.id,
      payload: { version: mandate.version, previousVersionId: existing.id },
      userId: owner
    });

    return NextResponse.json({ mandate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create a new mandate version." }, { status: 500 });
  }
}
