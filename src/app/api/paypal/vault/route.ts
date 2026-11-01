import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return NextResponse.json(
    { error: "Approve each order in PayPal Sandbox; approve-once Vault payments are not available in this build." },
    { status: 410 }
  );
}
