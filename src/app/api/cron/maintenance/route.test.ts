import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runMaintenance: vi.fn() }));
vi.mock("@/core/domain/maintenance", () => ({ runMaintenance: mocks.runMaintenance }));
import { POST } from "./route";

describe("POST /api/cron/maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  it("rejects requests without the configured secret", async () => {
    const response = await POST(new Request("http://localhost/api/cron/maintenance", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.runMaintenance).not.toHaveBeenCalled();
  });

  it("runs maintenance only for a valid secret header", async () => {
    mocks.runMaintenance.mockResolvedValue({ expiredApprovals: 2, voidedHolds: 0 });
    const response = await POST(new Request("http://localhost/api/cron/maintenance", {
      method: "POST", headers: { "x-cron-secret": "test-cron-secret" }
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expiredApprovals: 2, voidedHolds: 0 });
    expect(mocks.runMaintenance).toHaveBeenCalledOnce();
  });
});
