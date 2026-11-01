import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionOwner, sessionCookie } from "@/core/auth/session";

describe("signed sessions", () => {
  it("round-trips an owner through an httpOnly cookie", () => {
    const cookie = sessionCookie(createSessionToken("owner@example.com"));
    const request = new Request("http://localhost", { headers: { cookie: `${cookie.name}=${cookie.value}` } });
    expect(readSessionOwner(request)).toBe("owner@example.com");
    expect(cookie.options.httpOnly).toBe(true);
  });

  it("rejects a tampered cookie", () => {
    const cookie = sessionCookie(createSessionToken("owner@example.com"));
    const request = new Request("http://localhost", { headers: { cookie: `${cookie.name}=${cookie.value}tampered` } });
    expect(readSessionOwner(request)).toBeNull();
  });
});
