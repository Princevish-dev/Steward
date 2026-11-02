import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDatabasePool } from "@/db/client";
import { ensureDatabaseMigrated } from "@/db/migrate";
import { recordLedgerEvent } from "@/core/ledger/store";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function issueApprovalChallenge(approvalId: string, owner: string) {
  await ensureDatabaseMigrated();
  const pool = getDatabasePool();
  const approval = await pool.query(
    `SELECT a.id, COALESCE(SUM((item->>'unitPrice')::numeric * (item->>'quantity')::numeric), 0)::numeric(12,2)::text AS total
     FROM approvals a JOIN runs r ON r.id = a.run_id JOIN mandates m ON m.id = r.mandate_id
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(r.cart->'items', '[]'::jsonb)) item ON true
     WHERE a.id = $1 AND a.status = 'PENDING' AND a.expires_at > now() AND m.owner = $2
     GROUP BY a.id`,
    [approvalId, owner]
  );
  const row = approval.rows[0] as { id: string; total: string } | undefined;
  if (!row) throw new Error("APPROVAL_NOT_AVAILABLE");

  const nonce = randomBytes(32).toString("base64url");
  const inserted = await pool.query(
    `INSERT INTO typed_confirm_challenges (approval_id, owner, nonce_hash, attempts, expires_at, consumed_at)
     VALUES ($1, $2, $3, 0, now() + interval '5 minutes', NULL)
     ON CONFLICT (approval_id) DO UPDATE SET owner = EXCLUDED.owner, nonce_hash = EXCLUDED.nonce_hash,
       attempts = 0, expires_at = EXCLUDED.expires_at, consumed_at = NULL
     WHERE (typed_confirm_challenges.consumed_at IS NOT NULL AND typed_confirm_challenges.attempts < 5)
        OR typed_confirm_challenges.expires_at <= now()
     RETURNING approval_id`,
    [approvalId, owner, hash(nonce)]
  );
  if (!inserted.rowCount) throw new Error("CHALLENGE_ALREADY_ISSUED");
  return { nonce, prompt: `CONFIRM $${Number(row.total).toFixed(2)}`, expiresInSeconds: 300 };
}

export async function confirmApprovalWithChallenge(input: {
  approvalId: string;
  owner: string;
  nonce: string;
  phrase: string;
  reviewer: string;
}) {
  await ensureDatabaseMigrated();
  const client = await getDatabasePool().connect();
  let runId: string | null = null;
  let mandateId: string | null = null;
  try {
    await client.query("BEGIN");
    const selected = await client.query(
      `SELECT c.nonce_hash, c.attempts, a.run_id, m.id AS mandate_id,
              COALESCE((SELECT SUM((item->>'unitPrice')::numeric * (item->>'quantity')::numeric)
                        FROM jsonb_array_elements(COALESCE(r.cart->'items', '[]'::jsonb)) item), 0)::numeric(12,2)::text AS total
       FROM typed_confirm_challenges c
       JOIN approvals a ON a.id = c.approval_id
       JOIN runs r ON r.id = a.run_id
       JOIN mandates m ON m.id = r.mandate_id
       WHERE c.approval_id = $1 AND c.owner = $2 AND c.expires_at > now() AND c.consumed_at IS NULL
         AND c.attempts < 5 AND a.status = 'PENDING' AND a.expires_at > now() AND m.owner = $2
       FOR UPDATE OF c, a`,
      [input.approvalId, input.owner]
    );
    const challenge = selected.rows[0] as { nonce_hash: string; attempts: number; run_id: string; mandate_id: string; total: string } | undefined;
    if (!challenge) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: "CHALLENGE_INVALID_OR_EXPIRED" };
    }
    runId = challenge.run_id;
    mandateId = challenge.mandate_id;
    const suppliedHash = Buffer.from(hash(input.nonce), "hex");
    const storedHash = Buffer.from(challenge.nonce_hash, "hex");
    const nonceMatches = suppliedHash.length === storedHash.length && timingSafeEqual(suppliedHash, storedHash);
    const phraseMatches = input.phrase === `CONFIRM $${Number(challenge.total).toFixed(2)}`;
    if (!nonceMatches || !phraseMatches) {
      await client.query(
        `UPDATE typed_confirm_challenges SET attempts = attempts + 1,
           consumed_at = CASE WHEN attempts + 1 >= 5 THEN now() ELSE consumed_at END
         WHERE approval_id = $1`,
        [input.approvalId]
      );
      await client.query("COMMIT");
      return { ok: false as const, error: "CONFIRMATION_MISMATCH" };
    }

    await client.query("UPDATE typed_confirm_challenges SET consumed_at = now() WHERE approval_id = $1", [input.approvalId]);
    const resolved = await client.query(
      `UPDATE approvals SET status = 'APPROVED', reviewer = $2, resolved_at = now()
       WHERE id = $1 AND status = 'PENDING' AND expires_at > now()
       RETURNING id, run_id, status, reviewer, reason, created_at, resolved_at`,
      [input.approvalId, input.reviewer]
    );
    if (!resolved.rows[0]) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: "APPROVAL_NOT_AVAILABLE" };
    }
    await client.query("COMMIT");
    await recordLedgerEvent({
      type: "APPROVAL_CONFIRMED",
      runId,
      mandateId,
      payload: { approvalId: input.approvalId, reviewer: input.reviewer, amount: Number(challenge.total) },
      userId: input.owner
    });
    return { ok: true as const, approval: resolved.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
