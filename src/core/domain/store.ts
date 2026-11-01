import { randomUUID } from "node:crypto";
import type { Mandate } from "@/core/mandate/schema";
import { recordLedgerEvent } from "@/core/ledger/store";
import { getDatabasePool } from "@/db/client";

type JsonRecord = Record<string, unknown>;

export async function createMandate(mandate: Mandate): Promise<void> {
  await getDatabasePool().query(
    `INSERT INTO mandates (id, owner, purpose, definition, status)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [mandate.id, mandate.owner, mandate.purpose, JSON.stringify(mandate), mandate.status]
  );
  await recordLedgerEvent({
    type: "MANDATE_CREATED",
    runId: "system",
    mandateId: mandate.id,
    payload: { status: mandate.status, owner: mandate.owner }
  });
}

export async function getMandate(id: string): Promise<Mandate | null> {
  const result = await getDatabasePool().query(
    "SELECT definition FROM mandates WHERE id = $1",
    [id]
  );
  return result.rows[0]?.definition as Mandate | null;
}

export async function listMandatesForOwner(owner: string): Promise<Array<{ id: string; owner: string; purpose: string; status: string; period: { type: string; budget: number }; caps: { perItem: number | null; perTransaction: number | null; maxQuantityPerItem: number }; askAbove: number | null; categories: string[]; expiresAt: string }>> {
  const result = await getDatabasePool().query(
    `SELECT definition FROM mandates WHERE owner = $1 ORDER BY created_at ASC`,
    [owner]
  );
  return result.rows.map((row) => row.definition as { id: string; owner: string; purpose: string; status: string; period: { type: string; budget: number }; caps: { perItem: number | null; perTransaction: number | null; maxQuantityPerItem: number }; askAbove: number | null; categories: string[]; expiresAt: string });
}

export async function listRunsForOwner(owner: string) {
  const result = await getDatabasePool().query(
    `SELECT r.id AS run_id, r.mandate_id, r.task, r.decision, r.cart, r.created_at,
            m.status AS mandate_status,
            COALESCE((SELECT SUM((item->>'unitPrice')::numeric * (item->>'quantity')::numeric)
                      FROM jsonb_array_elements(r.cart->'items') item), 0) AS total
     FROM runs r
     JOIN mandates m ON m.id = r.mandate_id
     WHERE m.owner = $1
     ORDER BY r.created_at DESC LIMIT 200`,
    [owner]
  );
  return result.rows;
}

export async function listPaymentOrdersForOwner(owner: string) {
  const result = await getDatabasePool().query(
    `SELECT po.id, po.run_id, po.amount, po.currency, po.status, po.approval_url, po.capture_id,
            po.tracking_carrier, po.tracking_number, po.tracking_status, po.created_at, po.updated_at,
            r.mandate_id, r.task AS run_task, r.decision AS run_decision
     FROM payment_orders po
     JOIN runs r ON r.id = po.run_id
     JOIN mandates m ON m.id = r.mandate_id
     WHERE m.owner = $1
     ORDER BY po.created_at DESC LIMIT 200`,
    [owner]
  );
  return result.rows;
}

export async function listRefundsForOwner(owner: string) {
  const result = await getDatabasePool().query(
    `SELECT r.id AS refund_id, r.order_id, r.amount, r.status, r.created_at, r.response,
            po.run_id, po.amount AS order_amount
     FROM refunds r
     JOIN payment_orders po ON po.id = r.order_id
     JOIN runs ON runs.id = po.run_id
     JOIN mandates m ON m.id = runs.mandate_id
     WHERE m.owner = $1
     ORDER BY r.created_at DESC LIMIT 200`,
    [owner]
  );
  return result.rows;
}

export async function listTrackingForOwner(owner: string) {
  const result = await getDatabasePool().query(
    `SELECT po.id AS order_id, po.run_id, po.tracking_carrier, po.tracking_number, po.tracking_status,
            po.created_at, po.updated_at,
            r.mandate_id, r.task AS run_task
     FROM payment_orders po
     JOIN runs r ON r.id = po.run_id
     JOIN mandates m ON m.id = r.mandate_id
     WHERE m.owner = $1 AND po.tracking_carrier IS NOT NULL
     ORDER BY po.created_at DESC LIMIT 200`,
    [owner]
  );
  return result.rows;
}

export async function listDisputesForOwner(owner: string) {
  const result = await getDatabasePool().query(
    `SELECT d.id, d.order_id AS order_id, d.status, d.created_at, d.payload,
            po.run_id, po.amount AS order_amount
     FROM disputes d
     JOIN payment_orders po ON po.id = d.order_id
     JOIN runs ON runs.id = po.run_id
     JOIN mandates m ON m.id = runs.mandate_id
     WHERE m.owner = $1
     ORDER BY d.created_at DESC LIMIT 200`,
    [owner]
  );
  return result.rows;
}

export async function setMandateStatus(id: string, status: "ACTIVE" | "REVOKED"): Promise<Mandate | null> {
  const result = await getDatabasePool().query(
    `UPDATE mandates
     SET status = $2, definition = jsonb_set(definition, '{status}', to_jsonb($2::text)), updated_at = now()
     WHERE id = $1
     RETURNING definition`,
    [id, status]
  );
  const mandate = result.rows[0]?.definition as Mandate | undefined;
  if (!mandate) return null;
  await recordLedgerEvent({
    type: status === "ACTIVE" ? "MANDATE_CONFIRMED" : "MANDATE_REVOKED",
    runId: "system",
    mandateId: id,
    payload: { status }
  });
  return mandate;
}

export async function persistRun(input: {
  runId: string;
  mandate: Mandate;
  task: string;
  decision: string;
  cart: unknown;
  policy: unknown;
  cartHash: string;
}) {
  const pool = getDatabasePool();
  await pool.query(
    `INSERT INTO runs (id, mandate_id, owner, task, decision, cart, policy)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [input.runId, input.mandate.id, input.mandate.owner, input.task, input.decision, JSON.stringify(input.cart), JSON.stringify(input.policy)]
  );
  await recordLedgerEvent({
    type: "RUN_STARTED",
    runId: input.runId,
    mandateId: input.mandate.id,
    payload: { task: input.task }
  });
  await recordLedgerEvent({
    type: "CART_PROPOSED",
    runId: input.runId,
    mandateId: input.mandate.id,
    payload: { cartHash: input.cartHash }
  });
  await recordLedgerEvent({
    type: "DECISION_MADE",
    runId: input.runId,
    mandateId: input.mandate.id,
    payload: { decision: input.decision }
  });
}

export async function getRunContext(runId: string) {
  const result = await getDatabasePool().query(
    `SELECT r.id, r.mandate_id, r.decision, r.cart, m.status AS mandate_status, m.definition AS mandate,
            a.id AS approval_id, a.status AS approval_status, a.expires_at AS approval_expires_at,
            o.id AS order_id, o.status AS order_status, o.capture_id, o.cart_hash,
            o.tracking_carrier, o.tracking_number, o.tracking_status
     FROM runs r
     JOIN mandates m ON m.id = r.mandate_id
     LEFT JOIN LATERAL (
       SELECT * FROM approvals WHERE run_id = r.id ORDER BY created_at DESC LIMIT 1
     ) a ON true
     LEFT JOIN payment_orders o ON o.run_id = r.id
     WHERE r.id = $1`,
    [runId]
  );
  return result.rows[0] ?? null;
}

export async function getPurchaseHistory(mandateId: string, now = new Date()) {
  const result = await getDatabasePool().query(
    `SELECT
       COALESCE(SUM(CASE WHEN l.type = 'ORDER_CAPTURED' THEN (l.payload->>'amount')::numeric ELSE 0 END), 0) AS spent,
       COUNT(*) FILTER (WHERE l.type = 'ORDER_CAPTURED' AND l.timestamp >= $2::timestamptz - interval '24 hours') AS recent_auto,
       COALESCE(array_agg(DISTINCT l.payload->>'merchant') FILTER (WHERE l.type = 'ORDER_CAPTURED'), '{}') AS merchants
     FROM ledger_entries l
     WHERE l.mandate_id = $1
       AND l.timestamp >= date_trunc('month', $2::timestamptz)`,
    [mandateId, now.toISOString()]
  );
  const row = result.rows[0];
  return {
    spentInPeriod: Number(row?.spent ?? 0),
    autoPurchasesLast24h: Number(row?.recent_auto ?? 0),
    merchantsPurchasedUnderMandate: (row?.merchants ?? []).filter(Boolean)
  };
}

export async function reservePaymentOrder(input: { runId: string; amount: number; cartHash: string }) {
  const result = await getDatabasePool().query(
    `INSERT INTO payment_orders (id, run_id, amount, currency, status, cart_hash)
     VALUES ($1, $2, $3, 'USD', 'RESERVED', $4)
     ON CONFLICT (run_id) DO NOTHING
     RETURNING id, status`,
    [`pending_${input.runId}`, input.runId, input.amount, input.cartHash]
  );
  return result.rows[0] ?? null;
}

export async function persistPaymentOrder(input: {
  id: string;
  runId: string;
  amount: number;
  status: string;
  cartHash: string;
  approvalUrl?: string | null;
  vaultId?: string | null;
}) {
  await getDatabasePool().query(
    `UPDATE payment_orders SET id = $1, amount = $3, status = $4, approval_url = $5,
       vault_id = COALESCE($6, vault_id), cart_hash = $7, updated_at = now()
     WHERE run_id = $2`,
    [input.id, input.runId, input.amount, input.status, input.approvalUrl ?? null, input.vaultId ?? null, input.cartHash]
  );
  await recordLedgerEvent({
    type: "ORDER_CREATED",
    runId: input.runId,
    mandateId: (await getRunContext(input.runId))?.mandate_id ?? "unknown",
    payload: { orderId: input.id, amount: input.amount }
  });
}

export async function markOrderCaptured(runId: string, captureId: string | null, amount: number) {
  await getDatabasePool().query(
    "UPDATE payment_orders SET status = 'COMPLETED', capture_id = $2, updated_at = now() WHERE run_id = $1",
    [runId, captureId]
  );
  const context = await getRunContext(runId);
  if (context) {
    return recordLedgerEvent({
      type: "ORDER_CAPTURED",
      runId,
      mandateId: context.mandate_id,
      payload: { orderId: context.order_id, captureId, amount, merchant: "paypal-sandbox" }
    });
  }
  return null;
}

export async function persistTracking(runId: string, tracking: { carrier: string; trackingNumber: string; status: string }) {
    await getDatabasePool().query(
      "UPDATE payment_orders SET tracking_carrier = $2, tracking_number = $3, tracking_status = $4, updated_at = now() WHERE run_id = $1",
      [runId, tracking.carrier, tracking.trackingNumber, tracking.status]
    );
    const context = await getRunContext(runId);
    if (context) await recordLedgerEvent({
      type: "TRACKING_ADDED",
      runId,
      mandateId: context.mandate_id,
      payload: { orderId: context.order_id, carrier: tracking.carrier, trackingNumber: tracking.trackingNumber, status: tracking.status, simulated: true }
    });
  }

export async function claimWebhookEvent(eventId: string, eventType: string, payload: unknown): Promise<boolean> {
    const result = await getDatabasePool().query(
      `INSERT INTO paypal_webhook_events (event_id, event_type, payload)
       VALUES ($1, $2, $3::jsonb) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId, eventType, JSON.stringify(payload)]
    );
    return result.rowCount === 1;
}

export async function createApproval(runId: string, reason: string) {
  const id = randomUUID();
  await getDatabasePool().query(
    "INSERT INTO approvals (id, run_id, reason, expires_at) VALUES ($1, $2, $3, now() + interval '24 hours')",
    [id, runId, reason]
  );
  const context = await getRunContext(runId);
  await recordLedgerEvent({
    type: "APPROVAL_CREATED",
    runId,
    mandateId: context?.mandate_id ?? "unknown",
    payload: { approvalId: id, reason }
  });
  return id;
}

export async function listApprovals(owner?: string) {
  const result = await getDatabasePool().query(
    `SELECT a.id, a.run_id, CASE WHEN a.status = 'PENDING' AND a.expires_at <= now() THEN 'EXPIRED' ELSE a.status END AS status,
            a.reviewer, a.reason, a.created_at, a.resolved_at, a.expires_at,
            COALESCE((SELECT SUM((item->>'unitPrice')::numeric * (item->>'quantity')::numeric)
                      FROM jsonb_array_elements(r.cart->'items') item), 0) AS total,
            r.policy
     FROM approvals a JOIN runs r ON r.id = a.run_id JOIN mandates m ON m.id = r.mandate_id
     WHERE ($1::text IS NULL OR m.owner = $1)
     ORDER BY a.created_at DESC LIMIT 100`,
    [owner ?? null]
  );
  return result.rows;
}

export async function resolveApproval(id: string, status: "APPROVED" | "REJECTED", reviewer: string, owner?: string) {
  const result = await getDatabasePool().query(
    `UPDATE approvals SET status = $2, reviewer = $3, resolved_at = now()
     WHERE id = $1 AND status = 'PENDING' AND expires_at > now()
       AND ($4::text IS NULL OR EXISTS (
         SELECT 1 FROM runs r JOIN mandates m ON m.id = r.mandate_id
         WHERE r.id = approvals.run_id AND m.owner = $4
       ))
     RETURNING id, run_id, status, reviewer, reason, created_at, resolved_at`,
    [id, status, reviewer, owner ?? null]
  );
  const approval = result.rows[0] ?? null;
  if (approval) {
    const context = await getRunContext(approval.run_id);
    await recordLedgerEvent({
      type: status === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
      runId: approval.run_id,
      mandateId: context?.mandate_id ?? "unknown",
      payload: { approvalId: id, reviewer }
    });
  }
  return approval;
}

export async function persistRefund(input: { id: string; orderId: string; amount?: number; status: string; response: unknown }) {
  await getDatabasePool().query(
    `INSERT INTO refunds (id, order_id, amount, status, response)
     VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING`,
    [input.id, input.orderId, input.amount ?? null, input.status, JSON.stringify(input.response)]
  );
}

export async function findRefundForOrder(orderId: string) {
  const result = await getDatabasePool().query(
    `SELECT id, status, response
     FROM refunds
     WHERE order_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [orderId]
  );
  return result.rows[0] ?? null;
}

export async function persistDispute(input: { id: string; orderId?: string; status: string; payload: unknown }) {
  await getDatabasePool().query(
    `INSERT INTO disputes (id, order_id, status, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = now()`,
    [input.id, input.orderId ?? null, input.status, JSON.stringify(input.payload)]
  );
}

export async function listMandateApiKeysForOwner(owner: string) {
  const result = await getDatabasePool().query(
    `SELECT k.id, k.mandate_id, k.key_prefix, k.created_at, k.revoked_at, m.owner
     FROM mandate_api_keys k
     JOIN mandates m ON m.id = k.mandate_id
     WHERE m.owner = $1
     ORDER BY k.created_at DESC LIMIT 200`,
    [owner]
  );
  return result.rows;
}
