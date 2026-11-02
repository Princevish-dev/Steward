import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mandate } from "@/core/mandate/schema";
import { mandateFingerprint } from "@/core/mandate/fingerprint";

const mocks = vi.hoisted(() => ({ query: vi.fn(), recordLedgerEvent: vi.fn() }));
vi.mock("@/db/client", () => ({ getDatabasePool: () => ({ query: mocks.query }) }));
vi.mock("@/db/migrate", () => ({ ensureDatabaseMigrated: vi.fn() }));
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: mocks.recordLedgerEvent }));

import { getMandate } from "./store";

const legacyMandate: Mandate = {
  id: "mdt_legacy", owner: "owner@example.com", purpose: "Buy paper", currency: "USD",
  period: { type: "monthly", budget: 100 }, caps: { perItem: 20, perTransaction: 50, maxQuantityPerItem: 4 },
  askAbove: 40, categories: ["office_supplies"], merchants: { allow: [], deny: [] }, velocity: { maxAutoPurchasesPer24h: 3 },
  expiresAt: "2027-01-01T00:00:00.000Z", status: "ACTIVE"
};

describe("legacy active mandate fingerprint backfill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enrolls an active pre-fingerprint mandate once and records the migration event", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ definition: legacyMandate }] })
      .mockResolvedValueOnce({ rows: [{ definition: { ...legacyMandate, version: 1, fingerprint: mandateFingerprint({ ...legacyMandate, version: 1 }) } }] });

    const mandate = await getMandate(legacyMandate.id);
    expect(mandate?.fingerprint).toBe(mandateFingerprint({ ...legacyMandate, version: 1 }));
    expect(mocks.query.mock.calls[1]?.[0]).toContain("definition->>'fingerprint'");
    expect(mocks.recordLedgerEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "MANDATE_FINGERPRINT_BACKFILLED", mandateId: legacyMandate.id, userId: legacyMandate.owner
    }));
  });

  it("does not rewrite an already fingerprinted mandate", async () => {
    const fingerprinted = { ...legacyMandate, version: 1, fingerprint: mandateFingerprint({ ...legacyMandate, version: 1 }) };
    mocks.query.mockResolvedValueOnce({ rows: [{ definition: fingerprinted }] });
    const mandate = await getMandate(legacyMandate.id);
    expect(mandate).toEqual(fingerprinted);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.recordLedgerEvent).not.toHaveBeenCalled();
  });
});
