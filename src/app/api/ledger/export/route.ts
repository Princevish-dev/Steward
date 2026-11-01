import { NextResponse } from "next/server";
import { requireSessionOwner, ownsMandate } from "@/core/auth/session";
import { getMandate } from "@/core/domain/store";
import { readLedgerForMandate } from "@/core/ledger/store";
import { formatLedgerCsv, formatLedgerJson } from "@/core/ledger/export";

type AuthSuccess = {
  mandateId: string;
  format: "csv" | "json";
};

type AuthFailure = {
  error: NextResponse;
};

type AuthResult = AuthSuccess | AuthFailure;

async function authorizedMandate(request: Request): Promise<AuthResult> {
  let owner: string;
  try {
    owner = requireSessionOwner(request);
  } catch {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  const url = new URL(request.url);
  const mandateId = url.searchParams.get("mandateId");
  if (!mandateId) {
    return { error: NextResponse.json({ error: "mandateId is required." }, { status: 422 }) };
  }
  const mandate = await getMandate(mandateId);
  if (!mandate || !ownsMandate(owner, mandate.owner)) {
    return { error: NextResponse.json({ error: "Mandate access denied." }, { status: 403 }) };
  }
  const formatParam = url.searchParams.get("format")?.toLowerCase();
  const format = formatParam === "csv" ? "csv" : formatParam === "json" || !formatParam ? "json" : null;
  if (!format) {
    return { error: NextResponse.json({ error: "Unsupported format. Use format=csv or format=json." }, { status: 422 }) };
  }
  return { mandateId, format };
}

export async function GET(request: Request): Promise<Response> {
  const authorized = await authorizedMandate(request);
  if ("error" in authorized) {
    return authorized.error;
  }

  const entries = await readLedgerForMandate(authorized.mandateId);

  if (authorized.format === "csv") {
    const csvContent = formatLedgerCsv(entries);
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="steward-ledger-${authorized.mandateId}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  }

  const jsonContent = formatLedgerJson(authorized.mandateId, entries);
  return new Response(JSON.stringify(jsonContent, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="steward-ledger-${authorized.mandateId}.json"`,
      "Cache-Control": "no-store"
    }
  });
}
