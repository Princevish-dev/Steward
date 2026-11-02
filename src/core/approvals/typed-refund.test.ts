import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn() }));
vi.mock("@/db/client", () => ({ getDatabasePool: () => ({ query: mocks.query, connect: mocks.connect }) }));
vi.mock("@/db/migrate", () => ({ ensureDatabaseMigrated: vi.fn() }));
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: vi.fn() }));

import { issueRefundChallenge, consumeRefundChallenge } from "./typed-refund";
import { recordLedgerEvent } from "@/core/ledger/store";

describe("typed refund confirmation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues a challenge using the captured order amount from the database", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id: "run-1", mandate_id: "mdt-1", amount: "42.00" }] });
    mocks.query.mockResolvedValueOnce({ rowCount: 1 });
    const challenge = await issueRefundChallenge("run-1", "owner@example.com");
    expect(challenge.prompt).toBe("CONFIRM $42.00");
    expect(mocks.query.mock.calls[1]?.[1]?.[2]).not.toBe(challenge.nonce);
  });

  it("rejects invalid confirmation without writing a refund ledger event", async () => {
    const client = { query: vi.fn(), release: vi.fn() };
    mocks.connect.mockResolvedValue(client);
    client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({});
    const result = await consumeRefundChallenge({ runId: "run-1", owner: "owner@example.com", nonce: "bad", phrase: "CONFIRM $42.00" });
    expect(result.ok).toBe(false);
    expect(recordLedgerEvent).not.toHaveBeenCalled();
  });

  it("records the typed refund confirmation before allowing the refund call", async () => {
    const client = { query: vi.fn(), release: vi.fn() };
    mocks.connect.mockResolvedValue(client);
    const nonce = "one-time-refund-secret";
    const { createHash } = await import("node:crypto");
    const nonceHash = createHash("sha256").update(nonce).digest("hex");
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ nonce_hash: nonceHash, attempts: 0, mandate_id: "mdt-1", amount: "42.00" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const result = await consumeRefundChallenge({ runId: "run-1", owner: "owner@example.com", nonce, phrase: "CONFIRM $42.00" });
    expect(result.ok).toBe(true);
    expect(recordLedgerEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "REFUND_CONFIRMED", runId: "run-1", mandateId: "mdt-1", userId: "owner@example.com"
    }));
  });
});
