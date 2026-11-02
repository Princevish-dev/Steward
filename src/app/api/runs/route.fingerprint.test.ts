import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken } from "@/core/auth/session";
import { mandateFingerprint } from "@/core/mandate/fingerprint";
import type { Mandate } from "@/core/mandate/schema";

const mocks = vi.hoisted(() => ({
  getMandate: vi.fn(),
  persistRun: vi.fn(),
  createApproval: vi.fn(),
  getPurchaseHistory: vi.fn(),
  listRunsForOwner: vi.fn(),
  recordLedgerEvent: vi.fn()
}));

vi.mock("@/core/domain/store", () => mocks);
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: mocks.recordLedgerEvent }));

import { POST } from "./route";

const activeMandate: Mandate = {
  id: "mdt_tamper_test",
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

describe("POST /api/runs mandate fingerprint gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a direct database edit before shopping or AI and records the tamper event", async () => {
    const fingerprint = mandateFingerprint(activeMandate);
    const directlyEditedDatabaseDefinition = {
      ...activeMandate,
      period: { ...activeMandate.period, budget: 10_000 },
      fingerprint
    };
    mocks.getMandate.mockResolvedValue(directlyEditedDatabaseDefinition);

    const request = new Request("http://localhost/api/runs", {
      method: "POST",
      headers: {
        cookie: `steward_session=${createSessionToken(activeMandate.owner)}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ task: "Buy office paper", mandateId: activeMandate.id })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ decision: "BLOCK", reason: "MANDATE_TAMPERED" });
    expect(mocks.recordLedgerEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "MANDATE_TAMPERED",
      mandateId: activeMandate.id,
      payload: expect.objectContaining({ expectedFingerprint: fingerprint })
    }));
    expect(mocks.persistRun).not.toHaveBeenCalled();
    expect(mocks.getPurchaseHistory).not.toHaveBeenCalled();
  });
});
