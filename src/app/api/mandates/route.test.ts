import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";

const mocks = vi.hoisted(() => ({ createMandate: vi.fn() }));
vi.mock("@/core/domain/store", () => ({ createMandate: mocks.createMandate, listMandatesForOwner: vi.fn() }));
import { POST } from "./route";

describe("POST /api/mandates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects mandate creation without a session", async () => {
    const response = await POST(new Request("http://localhost/api/mandates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner: "owner@example.com", intent: "Buy paper" })
    }));
    expect(response.status).toBe(401);
    expect(mocks.createMandate).not.toHaveBeenCalled();
  });

  it("prevents an owner from creating a mandate for another owner", async () => {
    const response = await POST(new Request("http://localhost/api/mandates", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `steward_session=${createSessionToken("owner@example.com")}`
      },
      body: JSON.stringify({ owner: "victim@example.com", intent: "Buy paper" })
    }));
    expect(response.status).toBe(403);
    expect(mocks.createMandate).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
