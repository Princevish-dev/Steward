import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMaintenance } from "@/core/domain/maintenance";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Maintenance secret is not configured." }, { status: 503 });
  const supplied = request.headers.get("x-cron-secret") ?? "";
  const suppliedBytes = Buffer.from(supplied);
  const secretBytes = Buffer.from(secret);
  if (suppliedBytes.length !== secretBytes.length || !timingSafeEqual(suppliedBytes, secretBytes)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await runMaintenance());
  } catch {
    return NextResponse.json({ error: "Maintenance could not be completed." }, { status: 500 });
  }
}
