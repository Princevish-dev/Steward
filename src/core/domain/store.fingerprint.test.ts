import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mandate } from "@/core/mandate/schema";
import { mandateFingerprint } from "@/core/mandate/fingerprint";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  recordLedgerEvent: vi.fn()
}));

vi.mock("@/db/client", () => ({ getDatabasePool: () => ({ connect: mocks.connect }) }));
vi.mock("@/db/migrate", () => ({ ensureDatabaseMigrated: vi.fn() }));
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: mocks.recordLedgerEvent }));

import { setMandateStatus } from "./store";

const draftMandate: Mandate = {
  id: "mdt_confirm_test",
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
  status: "DRAFT"
};

describe("setMandateStatus fingerprint persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT definition")) return { rows: [{ definition: draftMandate }] };
      return { rows: [] };
    });
    mocks.connect.mockResolvedValue({ query: mocks.query, release: vi.fn() });
  });

  it("stores and records the canonical fingerprint when the owner confirms", async () => {
    const confirmed = await setMandateStatus(draftMandate.id, "ACTIVE");
    const updateCall = mocks.query.mock.calls.find(([sql]) => typeof sql === "string" && sql.startsWith("UPDATE mandates"));
    const stored = JSON.parse(updateCall?.[1][2] as string) as Mandate & { fingerprint?: string };

    expect(confirmed?.fingerprint).toBe(mandateFingerprint({ ...draftMandate, version: 1 }));
    expect(stored.fingerprint).toBe(confirmed?.fingerprint);
    expect(mocks.recordLedgerEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "MANDATE_CONFIRMED",
      payload: expect.objectContaining({ fingerprint: confirmed?.fingerprint, status: "ACTIVE" })
    }));
  });
});
