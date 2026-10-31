import { randomUUID } from "node:crypto";
import type { Mandate } from "@/core/mandate/schema";
import { getDatabasePool } from "@/db/client";

export async function persistRun(input: {
  runId: string;
  mandate: Mandate;
  task: string;
  decision: string;
  cart: unknown;
  policy: unknown;
}) {
  const pool = getDatabasePool();
  await pool.query(
    `INSERT INTO mandates (id, owner, purpose, definition, status)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition, updated_at = now()`,
    [input.mandate.id, input.mandate.owner, input.mandate.purpose, JSON.stringify(input.mandate), input.mandate.status]
  );
  await pool.query(
    `INSERT INTO runs (id, mandate_id, owner, task, decision, cart, policy)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [input.runId, input.mandate.id, input.mandate.owner, input.task, input.decision, JSON.stringify(input.cart), JSON.stringify(input.policy)]
  );
}

export async function persistPaymentOrder(input: {
  id: string;
  runId: string;
  amount: number;
  status: string;
  approvalUrl?: string | null;
  vaultId?: string | null;
}) {
  await getDatabasePool().query(
    `INSERT INTO payment_orders (id, run_id, amount, currency, status, approval_url, vault_id)
     VALUES ($1, $2, $3, 'USD', $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, approval_url = EXCLUDED.approval_url,
       vault_id = COALESCE(EXCLUDED.vault_id, payment_orders.vault_id), updated_at = now()`,
    [input.id, input.runId, input.amount, input.status, input.approvalUrl ?? null, input.vaultId ?? null]
  );
}

export async function createApproval(runId: string, reason: string) {
  const id = randomUUID();
  await getDatabasePool().query(
    "INSERT INTO approvals (id, run_id, reason) VALUES ($1, $2, $3)",
    [id, runId, reason]
  );
  return id;
}

export async function listApprovals() {
  const result = await getDatabasePool().query(
    `SELECT id, run_id, status, reviewer, reason, created_at, resolved_at
     FROM approvals ORDER BY created_at DESC LIMIT 100`
  );
  return result.rows;
}

export async function resolveApproval(id: string, status: "APPROVED" | "REJECTED", reviewer: string) {
  const result = await getDatabasePool().query(
    `UPDATE approvals SET status = $2, reviewer = $3, resolved_at = now()
     WHERE id = $1 AND status = 'PENDING' RETURNING id, run_id, status, reviewer, reason, created_at, resolved_at`,
    [id, status, reviewer]
  );
  return result.rows[0] ?? null;
}

export async function persistRefund(input: { id: string; orderId: string; amount?: number; status: string; response: unknown }) {
  await getDatabasePool().query(
    `INSERT INTO refunds (id, order_id, amount, status, response)
     VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING`,
    [input.id, input.orderId, input.amount ?? null, input.status, JSON.stringify(input.response)]
  );
}

export async function persistDispute(input: { id: string; orderId?: string; status: string; payload: unknown }) {
  await getDatabasePool().query(
    `INSERT INTO disputes (id, order_id, status, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = now()`,
    [input.id, input.orderId ?? null, input.status, JSON.stringify(input.payload)]
  );
}
