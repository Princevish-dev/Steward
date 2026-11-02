import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDatabasePool } from "@/db/client";
import { ensureDatabaseMigrated } from "@/db/migrate";
import { recordLedgerEvent } from "@/core/ledger/store";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function issueRefundChallenge(runId: string, owner: string) {
  await ensureDatabaseMigrated();
  const pool = getDatabasePool();
  const selected = await pool.query(
    `SELECT r.id, r.mandate_id, o.amount::numeric(12,2)::text AS amount
     FROM runs r JOIN mandates m ON m.id = r.mandate_id JOIN payment_orders o ON o.run_id = r.id
     WHERE r.id = $1 AND m.owner = $2 AND o.status IN ('COMPLETED', 'PAID') AND o.capture_id IS NOT NULL`,
    [runId, owner]
  );
  const row = selected.rows[0] as { id: string; mandate_id: string; amount: string } | undefined;
  if (!row) throw new Error("REFUND_NOT_AVAILABLE");
  const nonce = randomBytes(32).toString("base64url");
  const inserted = await pool.query(
    `INSERT INTO typed_refund_challenges (run_id, owner, nonce_hash, attempts, expires_at, consumed_at)
     VALUES ($1, $2, $3, 0, now() + interval '5 minutes', NULL)
     ON CONFLICT (run_id) DO UPDATE SET owner = EXCLUDED.owner, nonce_hash = EXCLUDED.nonce_hash,
       attempts = 0, expires_at = EXCLUDED.expires_at, consumed_at = NULL
     WHERE (typed_refund_challenges.consumed_at IS NOT NULL AND typed_refund_challenges.attempts < 5)
        OR typed_refund_challenges.expires_at <= now()
     RETURNING run_id`,
    [runId, owner, digest(nonce)]
  );
  if (!inserted.rowCount) throw new Error("CHALLENGE_ALREADY_ISSUED");
  return { nonce, prompt: `CONFIRM $${Number(row.amount).toFixed(2)}`, expiresInSeconds: 300 };
}

export async function consumeRefundChallenge(input: { runId: string; owner: string; nonce: string; phrase: string }) {
  await ensureDatabaseMigrated();
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT c.nonce_hash, c.attempts, r.mandate_id, o.amount::numeric(12,2)::text AS amount
       FROM typed_refund_challenges c JOIN runs r ON r.id = c.run_id
       JOIN mandates m ON m.id = r.mandate_id JOIN payment_orders o ON o.run_id = r.id
       WHERE c.run_id = $1 AND c.owner = $2 AND c.expires_at > now() AND c.consumed_at IS NULL
         AND c.attempts < 5 AND m.owner = $2 AND o.status IN ('COMPLETED', 'PAID') AND o.capture_id IS NOT NULL
       FOR UPDATE OF c`,
      [input.runId, input.owner]
    );
    const row = result.rows[0] as { nonce_hash: string; attempts: number; mandate_id: string; amount: string } | undefined;
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: "CHALLENGE_INVALID_OR_EXPIRED" };
    }
    const suppliedHash = Buffer.from(digest(input.nonce), "hex");
    const storedHash = Buffer.from(row.nonce_hash, "hex");
    const validNonce = suppliedHash.length === storedHash.length && timingSafeEqual(suppliedHash, storedHash);
    const validPhrase = input.phrase === `CONFIRM $${Number(row.amount).toFixed(2)}`;
    if (!validNonce || !validPhrase) {
      await client.query(
        `UPDATE typed_refund_challenges SET attempts = attempts + 1,
         consumed_at = CASE WHEN attempts + 1 >= 5 THEN now() ELSE consumed_at END WHERE run_id = $1`,
        [input.runId]
      );
      await client.query("COMMIT");
      return { ok: false as const, error: "CONFIRMATION_MISMATCH" };
    }
    await client.query("UPDATE typed_refund_challenges SET consumed_at = now() WHERE run_id = $1", [input.runId]);
    await client.query("COMMIT");
    await recordLedgerEvent({
      type: "REFUND_CONFIRMED",
      runId: input.runId,
      mandateId: row.mandate_id,
      payload: { amount: Number(row.amount), confirmation: "typed" },
      userId: input.owner
    });
    return { ok: true as const };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
