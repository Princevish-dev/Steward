import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";
import type { Mandate } from "@/core/mandate/schema";

const mocks = vi.hoisted(() => ({
  getMandate: vi.fn(),
  setMandateStatus: vi.fn()
}));

vi.mock("@/core/domain/store", () => mocks);

import { POST } from "./route";

const activeMandate: Mandate = {
  id: "mdt_already_active",
  owner: "owner@example.com",
  purpose: "Buy office paper",
  currency: "USD",
  period: { type: "monthly", budget: 100 },
  caps: { perItem: 20, perTransaction: 50, maxQuantityPerItem: 4 },
  askAbove: 40,
  categories: ["office_supplies"],
  merchants: { allow: ["paper.example"], deny: [] },
  velocity: { maxAutoPurchasesPer24h: 3 },
  expiresAt: "2026-12-01T00:00:00.000Z",
  status: "ACTIVE"
};

describe("POST /api/mandates/:id/confirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not re-confirm an active mandate to replace its fingerprint", async () => {
    mocks.getMandate.mockResolvedValue(activeMandate);
    mocks.setMandateStatus.mockResolvedValue(activeMandate);
    const request = new Request("http://localhost/api/mandates/mdt_already_active/confirm", {
      method: "POST",
      headers: { cookie: `steward_session=${createSessionToken(activeMandate.owner)}` }
    });

    const response = await POST(request, { params: Promise.resolve({ id: activeMandate.id }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Active mandates must be amended into a new version before changes can be confirmed.");
    expect(mocks.setMandateStatus).not.toHaveBeenCalled();
  });
});
