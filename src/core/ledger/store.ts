import { appendLedgerEntry, GENESIS_HASH } from "@/core/ledger/append";
import type { LedgerEntry } from "@/core/ledger/types";
import { getDatabasePool } from "@/db/client";

type LedgerInput = {
  type: string;
  runId: string;
  mandateId: string;
  payload: Record<string, unknown>;
};

function rowToEntry(row: Record<string, unknown>): LedgerEntry {
  return {
    sequence: Number(row.sequence),
    timestamp: new Date(String(row.timestamp)).toISOString(),
    type: String(row.type),
    runId: String(row.run_id),
    mandateId: String(row.mandate_id),
    payload: row.payload as Record<string, unknown>,
    prevHash: String(row.prev_hash),
    entryHash: String(row.entry_hash)
  };
}

export async function recordLedgerEvent(input: LedgerInput): Promise<LedgerEntry> {
  const pool = getDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.mandateId]);
    const previous = await client.query(
      "SELECT entry_hash FROM ledger_entries WHERE mandate_id = $1 ORDER BY sequence DESC LIMIT 1",
      [input.mandateId]
    );
    const nextSequence = await client.query(
      "SELECT nextval(pg_get_serial_sequence('ledger_entries', 'sequence')) AS sequence"
    );
    const previousEntry = previous.rows[0];
    const timestamp = new Date(Math.floor(Date.now() / 1000) * 1000);
    const sequence = Number(nextSequence.rows[0].sequence);
    const candidate = appendLedgerEntry(
      [{
        sequence: sequence - 1,
        timestamp: timestamp.toISOString(),
        type: "",
        runId: "",
        mandateId: input.mandateId,
        payload: {},
        prevHash: GENESIS_HASH,
        entryHash: previousEntry ? String(previousEntry.entry_hash) : GENESIS_HASH
      }],
      input,
      timestamp
    );
    const inserted = await client.query(
      `INSERT INTO ledger_entries
        (sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       RETURNING sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash`,
      [
        candidate.sequence,
        candidate.timestamp,
        candidate.type,
        candidate.runId,
        candidate.mandateId,
        JSON.stringify(candidate.payload),
        candidate.prevHash,
        candidate.entryHash
      ]
    );
    await client.query("COMMIT");
    return rowToEntry(inserted.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function readLedger(): Promise<LedgerEntry[]> {
  const result = await getDatabasePool().query(
    `SELECT sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash
     FROM ledger_entries ORDER BY sequence ASC`
  );
  return result.rows.map(rowToEntry);
}

export async function readLedgerForMandate(mandateId: string): Promise<LedgerEntry[]> {
  const result = await getDatabasePool().query(
    `SELECT sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash
     FROM ledger_entries WHERE mandate_id = $1 ORDER BY sequence ASC`,
    [mandateId]
  );
  return result.rows.map(rowToEntry);
}

export async function readLedgerGridForMandate(mandateId: string) {
  const result = await getDatabasePool().query(
    `SELECT l.sequence, l.timestamp, l.type, l.run_id, l.entry_hash,
            r.decision, r.policy
     FROM ledger_entries l
     LEFT JOIN runs r ON r.id = l.run_id
     WHERE l.mandate_id = $1
     ORDER BY l.sequence ASC`,
    [mandateId]
  );
  return result.rows.map((row) => ({
    sequence: Number(row.sequence),
    timestamp: new Date(String(row.timestamp)).toISOString(),
    type: String(row.type),
    runId: String(row.run_id),
    entryHash: String(row.entry_hash),
    decision: row.decision ? String(row.decision) : undefined,
    rationale: (row.policy as { decision?: string } | null)?.decision,
    ruleResults: (row.policy as { ruleResults?: unknown[] } | null)?.ruleResults
  }));
}

export async function readLedgerGrid() {
  const result = await getDatabasePool().query(
    `SELECT l.sequence, l.timestamp, l.type, l.run_id, l.entry_hash,
            r.decision, r.policy
     FROM ledger_entries l
     LEFT JOIN runs r ON r.id = l.run_id
     ORDER BY l.sequence ASC`
  );
  return result.rows.map((row) => ({
    sequence: Number(row.sequence),
    timestamp: new Date(String(row.timestamp)).toISOString(),
    type: String(row.type),
    runId: String(row.run_id),
    entryHash: String(row.entry_hash),
    decision: row.decision ? String(row.decision) : undefined,
    rationale: (row.policy as { decision?: string } | null)?.decision,
    ruleResults: (row.policy as { ruleResults?: unknown[] } | null)?.ruleResults
  }));
}

export async function findLedgerEvent(type: string, key: string): Promise<LedgerEntry | null> {
  const result = await getDatabasePool().query(
    `SELECT sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash
     FROM ledger_entries
     WHERE type = $1 AND payload->>'orderId' = $2
     ORDER BY sequence DESC LIMIT 1`,
    [type, key]
  );
  return result.rows[0] ? rowToEntry(result.rows[0]) : null;
}

export async function readLedgerForRun(runId: string): Promise<LedgerEntry[]> {
  const result = await getDatabasePool().query(
    `SELECT sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash
     FROM ledger_entries WHERE run_id = $1 ORDER BY sequence ASC`,
    [runId]
  );
  return result.rows.map(rowToEntry);
}
