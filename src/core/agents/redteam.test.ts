import { describe, expect, it } from "vitest";
import { quarantineProductText, redTeamFixtures } from "@/core/agents/redteam";

describe("red-team fixtures", () => {
  it("contains all five playbook attacks", () => {
    expect(redTeamFixtures).toHaveLength(5);
    expect(redTeamFixtures.every((fixture) => fixture.expected === "BLOCK" || fixture.expected === "ASK_HUMAN")).toBe(
      true
    );
  });

  it("flags instruction-like product text without executing it", () => {
    const result = quarantineProductText(redTeamFixtures[0].attack);
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toContain("SYSTEM");
  });
});
