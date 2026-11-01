import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionToken, sessionCookie } from "@/core/auth/session";

describe("Route Protection Middleware", () => {
  it("allows public landing page '/' without authentication", () => {
    const request = new NextRequest("http://localhost/");
    const response = middleware(request);
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("allows public login page '/login' without authentication", () => {
    const request = new NextRequest("http://localhost/login");
    const response = middleware(request);
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("allows public health endpoint '/api/health' without authentication", () => {
    const request = new NextRequest("http://localhost/api/health");
    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it("redirects unauthenticated user accessing '/dashboard' to '/login?next=%2Fdashboard'", () => {
    const request = new NextRequest("http://localhost/dashboard");
    const response = middleware(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fdashboard");
  });

  it("redirects unauthenticated user accessing '/approvals' to '/login'", () => {
    const request = new NextRequest("http://localhost/approvals");
    const response = middleware(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
  });

  it("returns 401 JSON for unauthenticated protected API route '/api/mandates'", async () => {
    const request = new NextRequest("http://localhost/api/mandates");
    const response = middleware(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required.");
  });

  it("allows authenticated user to access '/dashboard'", () => {
    const token = createSessionToken("user@example.com");
    const cookie = sessionCookie(token);
    const request = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: `${cookie.name}=${cookie.value}` }
    });
    const response = middleware(request);
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("redirects authenticated user accessing '/login' to '/dashboard'", () => {
    const token = createSessionToken("user@example.com");
    const cookie = sessionCookie(token);
    const request = new NextRequest("http://localhost/login", {
      headers: { cookie: `${cookie.name}=${cookie.value}` }
    });
    const response = middleware(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/dashboard");
  });
});

