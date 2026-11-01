import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/core/auth/session";

export async function POST(_request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookie());
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(clearSessionCookie());
  return response;
}
