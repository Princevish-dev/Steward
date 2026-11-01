import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  readSession,
  readSessionOwner,
  sessionCookie,
  clearSessionCookie,
  requireSession
} from "@/core/auth/session";

describe("signed sessions", () => {
  it("round-trips an owner through an httpOnly cookie", () => {
    const cookie = sessionCookie(createSessionToken("owner@example.com"));
    const request = new Request("http://localhost", { headers: { cookie: `${cookie.name}=${cookie.value}` } });
    expect(readSessionOwner(request)).toBe("owner@example.com");
    expect(cookie.options.httpOnly).toBe(true);
  });

  it("round-trips structured user metadata with user_id and role", () => {
    const token = createSessionToken({ id: "usr_123", email: "judge@example.com", role: "judge" });
    const cookie = sessionCookie(token);
    const request = new Request("http://localhost", { headers: { cookie: `${cookie.name}=${cookie.value}` } });
    const session = readSession(request);
    expect(session).not.toBeNull();
    expect(session?.user.id).toBe("usr_123");
    expect(session?.user.email).toBe("judge@example.com");
    expect(session?.user.role).toBe("judge");
    expect(readSessionOwner(request)).toBe("judge@example.com");
  });

  it("rejects a tampered cookie", () => {
    const cookie = sessionCookie(createSessionToken("owner@example.com"));
    const request = new Request("http://localhost", { headers: { cookie: `${cookie.name}=${cookie.value}tampered` } });
    expect(readSessionOwner(request)).toBeNull();
    expect(readSession(request)).toBeNull();
  });

  it("rejects missing session when requireSession is called", () => {
    const request = new Request("http://localhost");
    expect(() => requireSession(request)).toThrow("AUTH_REQUIRED");
  });

  it("provides clearSessionCookie with maxAge 0", () => {
    const cleared = clearSessionCookie();
    expect(cleared.options.maxAge).toBe(0);
    expect(cleared.value).toBe("");
  });
});
