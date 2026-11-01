import { NextResponse } from "next/server";
import { createSessionToken, sessionCookie } from "@/core/auth/session";
import { getPublicBaseUrl } from "@/core/http/public-url";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  if (!body || typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }
  const token = createSessionToken(body.email);
  const response = NextResponse.json({
    sent: true,
    ...(process.env.NODE_ENV === "production" ? {} : { magicLink: `/api/auth/magic-link?token=${encodeURIComponent(token)}` })
  });
  response.cookies.set(sessionCookie(token));
  return response;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token is required." }, { status: 422 });
  const response = NextResponse.redirect(`${getPublicBaseUrl(request)}/dashboard`);
  response.cookies.set(sessionCookie(token));
  return response;
}
