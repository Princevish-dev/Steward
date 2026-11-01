import { NextResponse } from "next/server";
import { verifyLedger } from "@/core/ledger/verify";
import type { LedgerEntry } from "@/core/ledger/types";
import { readLedger, readLedgerGrid } from "@/core/ledger/store";

export async function POST(request: Request) {
  let entries: unknown = await readLedger();
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

export async function GET() {
  const entries = await readLedger();
  return NextResponse.json({ entries: await readLedgerGrid(), verification: verifyLedger(entries) });
}
