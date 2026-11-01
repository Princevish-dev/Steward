import { describe, expect, it } from "vitest";
import { formatLedgerCsv, formatLedgerJson } from "@/core/ledger/export";
import type { LedgerEntry } from "@/core/ledger/types";

const mockEntries: LedgerEntry[] = [
  {
    sequence: 1,
    timestamp: "2026-11-01T20:00:00.000Z",
    type: "MANDATE_CREATED",
    runId: "system",
    mandateId: "mdt_test_123",
    payload: { status: "ACTIVE", owner: "owner@example.com" },
    prevHash: "0".repeat(64),
    entryHash: "a".repeat(64)
  },
  {
    sequence: 2,
    timestamp: "2026-11-01T20:01:00.000Z",
    type: "DECISION_MADE",
    runId: "run_test_456",
    mandateId: "mdt_test_123",
    payload: { decision: "AUTO_APPROVE", notes: "Comma, and quotes test" },
    prevHash: "a".repeat(64),
    entryHash: "b".repeat(64)
  }
];

describe("Ledger export formatters", () => {
  it("formats valid RFC 4180 CSV with escaped cells", () => {
    const csv = formatLedgerCsv(mockEntries);
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe("sequence,timestamp,type,runId,mandateId,prevHash,entryHash,payload");
    expect(lines[1]).toContain("1,2026-11-01T20:00:00.000Z,MANDATE_CREATED,system,mdt_test_123");
    expect(lines[2]).toContain("AUTO_APPROVE");
    expect(lines[2]).toContain("Comma, and quotes test");
  });

  it("handles empty ledger entries array in CSV without throwing", () => {
    const csv = formatLedgerCsv([]);
    expect(csv).toBe("sequence,timestamp,type,runId,mandateId,prevHash,entryHash,payload");
  });

  it("formats structured JSON packet with verification metadata", () => {
    const json = formatLedgerJson("mdt_test_123", mockEntries);
    expect(json.mandateId).toBe("mdt_test_123");
    expect(json.count).toBe(2);
    expect(json.entries).toHaveLength(2);
    expect(typeof json.exportedAt).toBe("string");
    expect(json.verification).toBeDefined();
  });
});
