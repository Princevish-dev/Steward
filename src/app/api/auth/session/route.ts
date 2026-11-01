import { NextResponse } from "next/server";
import { readSession } from "@/core/auth/session";

export async function GET(request: Request) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({
    authenticated: true,
    user: session.user
  });
}

