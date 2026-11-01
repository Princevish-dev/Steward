import { describe, expect, it } from "vitest";
import { ownsMandate } from "@/core/auth/session";

describe("mandate ownership", () => {
  it.each(["confirm", "revoke", "runs", "approvals", "mcp/keys"])("rejects cross-owner access for %s", () => {
    expect(ownsMandate("alice@example.com", "bob@example.com")).toBe(false);
  });

  it("allows the owning session", () => {
    expect(ownsMandate("alice@example.com", "alice@example.com")).toBe(true);
  });
});
