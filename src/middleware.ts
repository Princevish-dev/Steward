import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "steward_session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/health",
  "/api/cron/maintenance",
  "/api/openapi",
  "/api/paypal/webhook",
  "/api-docs"
];

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  try {
    const b64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(b64);
    const payload = JSON.parse(jsonStr) as { owner?: unknown; email?: unknown; exp?: unknown };
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return false;
    }
    return Boolean(payload.owner || payload.email);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal Next.js paths are always bypassed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = isValidSessionToken(token);

  // If user is already authenticated and visits /login, redirect to /dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Root landing page is public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Check public API / docs prefixes
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return NextResponse.next();
    }
  }

  // If unauthenticated:
  if (!isAuthenticated) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    // If it's an application UI route (/dashboard, /new, /approvals, /mandates, /orders, /ledger, etc.), redirect to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};
