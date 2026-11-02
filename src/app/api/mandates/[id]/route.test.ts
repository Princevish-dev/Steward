import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";
import type { Mandate } from "@/core/mandate/schema";

const mocks = vi.hoisted(() => ({
  getMandate: vi.fn(),
  updateMandateDraft: vi.fn()
}));

vi.mock("@/core/domain/store", () => ({
  getMandate: mocks.getMandate,
  updateMandateDraft: mocks.updateMandateDraft
}));

import { PATCH } from "./route";

const draftMandate: Mandate = {
  id: "mdt_draft_test",
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
  status: "DRAFT",
  version: 2,
  previousVersionId: "mdt_previous"
};

describe("PATCH /api/mandates/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists owner edits to a draft while preserving its version lineage", async () => {
    mocks.getMandate.mockResolvedValue(draftMandate);
    const edited = { ...draftMandate, period: { ...draftMandate.period, budget: 250 } };
    mocks.updateMandateDraft.mockResolvedValue(edited);
    const request = new Request("http://localhost/api/mandates/mdt_draft_test", {
      method: "PATCH",
      headers: {
        cookie: `steward_session=${createSessionToken(draftMandate.owner)}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(edited)
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: draftMandate.id }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mandate).toMatchObject({
      period: { budget: 250 },
      version: draftMandate.version,
      previousVersionId: draftMandate.previousVersionId,
      status: "DRAFT"
    });
    expect(mocks.updateMandateDraft).toHaveBeenCalledWith(edited, draftMandate.owner);
  });
});
