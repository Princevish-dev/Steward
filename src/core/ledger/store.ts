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
    const previous = await client.query(
      "SELECT sequence, entry_hash FROM ledger_entries ORDER BY sequence DESC LIMIT 1 FOR UPDATE"
    );
    const previousEntry = previous.rows[0];
    const timestamp = new Date();
    const candidate = appendLedgerEntry(
      previousEntry
        ? [{
            sequence: Number(previousEntry.sequence),
            timestamp: timestamp.toISOString(),
            type: "",
            runId: "",
            mandateId: "",
            payload: {},
            prevHash: GENESIS_HASH,
            entryHash: String(previousEntry.entry_hash)
          }]
        : [],
      input,
      timestamp
    );
    const inserted = await client.query(
      `INSERT INTO ledger_entries
        (timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING sequence, timestamp, type, run_id, mandate_id, payload, prev_hash, entry_hash`,
      [
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
