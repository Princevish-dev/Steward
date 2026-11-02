import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn() }));
vi.mock("@/db/client", () => ({ getDatabasePool: () => ({ query: mocks.query, connect: mocks.connect }) }));
vi.mock("@/db/migrate", () => ({ ensureDatabaseMigrated: vi.fn() }));
vi.mock("@/core/ledger/store", () => ({ recordLedgerEvent: vi.fn() }));

import { issueApprovalChallenge, confirmApprovalWithChallenge } from "./typed-confirm";
import { recordLedgerEvent } from "@/core/ledger/store";

describe("typed approval confirmation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues a one-time challenge bound to an owned pending approval and computed total", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ id: "approval-1", total: "18.50" }] });
    mocks.query.mockResolvedValueOnce({ rows: [{ approval_id: "approval-1" }], rowCount: 1 });

    const challenge = await issueApprovalChallenge("approval-1", "owner@example.com");

    expect(challenge.prompt).toBe("CONFIRM $18.50");
    expect(challenge.nonce).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(mocks.query.mock.calls[1]?.[0]).toContain("ON CONFLICT (approval_id)");
    expect(mocks.query.mock.calls[1]?.[1]?.[2]).not.toBe(challenge.nonce);
  });

  it("does not resolve an approval when the typed phrase is wrong", async () => {
    const client = { query: vi.fn(), release: vi.fn() };
    mocks.connect.mockResolvedValue(client);
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ nonce_hash: "x", attempts: 0, total: "18.50", run_id: "run-1", mandate_id: "mdt-1" }] })
      .mockResolvedValueOnce({});

    const result = await confirmApprovalWithChallenge({
      approvalId: "approval-1", owner: "owner@example.com", nonce: "wrong", phrase: "CONFIRM $18.50", reviewer: "owner@example.com"
    });

    expect(result.ok).toBe(false);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("attempts = attempts + 1"), expect.any(Array));
    expect(recordLedgerEvent).not.toHaveBeenCalled();
  });

  it("records APPROVAL_CONFIRMED after consuming a correct one-time challenge", async () => {
    const client = { query: vi.fn(), release: vi.fn() };
    mocks.connect.mockResolvedValue(client);
    const nonce = "one-time-secret";
    const { createHash } = await import("node:crypto");
    const nonceHash = createHash("sha256").update(nonce).digest("hex");
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ nonce_hash: nonceHash, attempts: 0, total: "18.50", run_id: "run-1", mandate_id: "mdt-1" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "approval-1", status: "APPROVED" }] })
      .mockResolvedValueOnce({});

    const result = await confirmApprovalWithChallenge({
      approvalId: "approval-1", owner: "owner@example.com", nonce, phrase: "CONFIRM $18.50", reviewer: "owner@example.com"
    });

    expect(result.ok).toBe(true);
    expect(recordLedgerEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "APPROVAL_CONFIRMED", runId: "run-1", mandateId: "mdt-1", userId: "owner@example.com"
    }));
    expect(client.release).toHaveBeenCalled();
  });
});
