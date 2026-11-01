import { describe, expect, it } from "vitest";
import { GET as getSession } from "@/app/api/auth/session/route";
import { POST as postLogin } from "@/app/api/auth/login/route";
import { POST as postLogout } from "@/app/api/auth/logout/route";
import { createSessionToken, sessionCookie } from "@/core/auth/session";

describe("Auth API Endpoints", () => {
  it("returns unauthenticated when no session cookie is present", async () => {
    const request = new Request("http://localhost/api/auth/session");
    const response = await getSession(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.user).toBeNull();
  });

  it("returns user session when valid session cookie is present", async () => {
    const token = createSessionToken({ id: "judge@example.com", email: "judge@example.com", role: "judge" });
    const cookie = sessionCookie(token);
    const request = new Request("http://localhost/api/auth/session", {
      headers: { cookie: `${cookie.name}=${cookie.value}` }
    });
    const response = await getSession(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.email).toBe("judge@example.com");
    expect(body.user.role).toBe("judge");
  });

  it("authenticates valid email via /api/auth/login and sets session cookie", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "buyer@example.com" })
    });
    const response = await postLogin(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.user.email).toBe("buyer@example.com");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("steward_session=");
  });

  it("rejects invalid email via /api/auth/login", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" })
    });
    const response = await postLogin(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("clears session cookie on /api/auth/logout", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST"
    });
    const response = await postLogout(request);
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("steward_session=");
  });
});
