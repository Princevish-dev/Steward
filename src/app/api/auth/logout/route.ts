import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("steward_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/new", request.url));
  response.cookies.set("steward_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
