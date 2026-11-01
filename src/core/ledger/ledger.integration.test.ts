import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDatabasePool } from "@/db/client";
import { recordLedgerEvent, readLedgerForMandate } from "@/core/ledger/store";
import { verifyLedger } from "@/core/ledger/verify";

const enabled = (process.env.LEDGER_INTEGRATION === "true" || process.env.RUN_SANDBOX_TESTS === "1") && Boolean(process.env.DATABASE_URL);
const describeIntegration = enabled ? describe : describe.skip;

describeIntegration("ledger database invariants", () => {
  const mandateId = `ledger-test-${randomUUID()}`;

  afterAll(async () => {
    await getDatabasePool().query("DELETE FROM ledger_entries WHERE mandate_id = $1", [mandateId]);
    await getDatabasePool().end();
  });

  it("serializes 50 concurrent appends and keeps mandate chains isolated", async () => {
    await Promise.all(Array.from({ length: 50 }, (_, index) => recordLedgerEvent({
      type: "LEDGER_TEST",
      runId: `run_${index}`,
      mandateId,
      payload: { index, nested: { b: 2, a: 1 } }
    })));
    const entries = await readLedgerForMandate(mandateId);
    expect(entries).toHaveLength(50);
    const verification = verifyLedger(entries);
    expect(verification).toEqual({ valid: true });
    const other = await recordLedgerEvent({
      type: "LEDGER_TEST_OTHER",
      runId: "other",
      mandateId: `${mandateId}-other`,
      payload: { ok: true }
    });
    expect(other.prevHash).toBe("0".repeat(64));
    await getDatabasePool().query("DELETE FROM ledger_entries WHERE mandate_id = $1", [`${mandateId}-other`]);
  }, 30_000);
});
