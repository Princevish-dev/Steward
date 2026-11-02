import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";
import type { Mandate } from "@/core/mandate/schema";

const mocks = vi.hoisted(() => ({
  getMandate: vi.fn(),
  createMandate: vi.fn(),
  recordLedgerEvent: vi.fn()
}));

vi.mock("@/core/domain/store", () => ({
  getMandate: mocks.getMandate,
  createMandate: mocks.createMandate
}));
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: mocks.recordLedgerEvent }));

import { POST } from "./route";

const activeMandate: Mandate & { version: number; fingerprint: string } = {
  id: "mdt_original",
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
  status: "ACTIVE",
  version: 1,
  fingerprint: "a".repeat(64)
};

describe("POST /api/mandates/:id/amend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an owner-scoped draft version without carrying the old fingerprint", async () => {
    mocks.getMandate.mockResolvedValue(activeMandate);
    const request = new Request("http://localhost/api/mandates/mdt_original/amend", {
      method: "POST",
      headers: { cookie: `steward_session=${createSessionToken(activeMandate.owner)}` }
    });

    const response = await POST(request, { params: Promise.resolve({ id: activeMandate.id }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.mandate).toMatchObject({
      owner: activeMandate.owner,
      status: "DRAFT",
      version: 2,
      previousVersionId: activeMandate.id
    });
    expect(body.mandate.id).not.toBe(activeMandate.id);
    expect(body.mandate.fingerprint).toBeUndefined();
    expect(mocks.createMandate).toHaveBeenCalledWith(expect.objectContaining({
      status: "DRAFT",
      version: 2,
      previousVersionId: activeMandate.id
    }), activeMandate.owner);
    expect(mocks.recordLedgerEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "MANDATE_VERSION_CREATED",
      payload: expect.objectContaining({ version: 2, previousVersionId: activeMandate.id })
    }));
  });
});
