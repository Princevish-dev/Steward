import { NextResponse } from "next/server";
import { requireSessionOwner, ownsMandate } from "@/core/auth/session";
import { getMandate, listMandatesForOwner } from "@/core/domain/store";
import { readLedgerForMandate, readLedgerGridForMandate } from "@/core/ledger/store";
import { verifyLedger } from "@/core/ledger/verify";
import type { LedgerEntry } from "@/core/ledger/types";

async function authorizedMandate(request: Request) {
  let owner: string;
  try {
    owner = requireSessionOwner(request);
  } catch {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  let mandateId = new URL(request.url).searchParams.get("mandateId");
  if (!mandateId) {
    const mandates = await listMandatesForOwner(owner);
    if (!mandates.length) {
      return { empty: true as const, owner };
    }
    mandateId = mandates[0].id;
  }
  const mandate = await getMandate(mandateId);
  if (!mandate || !ownsMandate(owner, mandate.owner)) {
    return { error: NextResponse.json({ error: "Mandate access denied." }, { status: 403 }) };
  }
  return { mandateId, owner };
}

export async function POST(request: Request) {
  const authorized = await authorizedMandate(request);
  if ("error" in authorized) return authorized.error;
  if ("empty" in authorized) {
    return NextResponse.json({ valid: true, error: null, entries: 0 });
  }
  let entries: unknown = await readLedgerForMandate(authorized.mandateId);
  try {
    const body = await request.json();
    if (body !== undefined) entries = body;
  } catch {
    // An empty request verifies the server ledger.
  }
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "Request body must be a ledger entry array." }, { status: 422 });
  }
  return NextResponse.json(verifyLedger(entries as LedgerEntry[]));
}

export async function GET(request: Request) {
  const authorized = await authorizedMandate(request);
  if ("error" in authorized) return authorized.error;
  if ("empty" in authorized) {
    return NextResponse.json({
      entries: [],
      verification: { valid: true, error: null, entries: 0 }
    });
  }
  const entries = await readLedgerForMandate(authorized.mandateId);
  return NextResponse.json({
    entries: await readLedgerGridForMandate(authorized.mandateId),
    verification: verifyLedger(entries)
  });
}
