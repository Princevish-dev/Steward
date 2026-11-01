import { describe, expect, it } from "vitest";
import { hashMcpKey, isMandateKeyScopedTo } from "@/core/mcp/keys";

describe("MCP API keys", () => {
  it("hashes the same key deterministically and never stores the raw value", () => {
    expect(hashMcpKey("steward_test")).toBe(hashMcpKey("steward_test"));
    expect(hashMcpKey("steward_test")).not.toContain("steward_test");
  });

  it("allows its mandate and rejects another mandate", () => {
    expect(isMandateKeyScopedTo("mandate-a", "mandate-a")).toBe(true);
    expect(isMandateKeyScopedTo("mandate-a", "mandate-b")).toBe(false);
  });
});
