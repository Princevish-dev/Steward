/**
 * Database Schema Definitions
 * Provides type definitions and schema metadata for PostgreSQL Lakebase tables,
 * including user isolation columns (user_id) and high-volume performance indexes.
 */

export interface MandateEntity {
  id: string;
  owner: string;
  userId?: string | null;
  purpose: string;
  definition: Record<string, unknown>;
  status: "DRAFT" | "ACTIVE" | "REVOKED";
  createdAt: Date;
  updatedAt: Date;
}

export interface RunEntity {
  id: string;
  mandateId: string;
  owner: string;
  userId?: string | null;
  task: string;
  decision: "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK";
  cart: Record<string, unknown>;
  policy: Record<string, unknown>;
  createdAt: Date;
}

export interface LedgerEntryEntity {
  sequence: number;
  timestamp: Date;
  type: string;
  runId: string;
  mandateId: string;
  userId?: string | null;
  payload: Record<string, unknown>;
  prevHash: string;
  entryHash: string;
}

export interface PaymentOrderEntity {
  id: string;
  runId: string;
  amount: string;
  currency: string;
  status: string;
  approvalUrl?: string | null;
  vaultId?: string | null;
  captureId?: string | null;
  cartHash?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalEntity {
  id: string;
  runId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  reviewer?: string | null;
  reason?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  resolvedAt?: Date | null;
}

export interface RefundEntity {
  id: string;
  orderId: string;
  amount?: string | null;
  status: string;
  response: Record<string, unknown>;
  createdAt: Date;
}

export interface DisputeEntity {
  id: string;
  orderId?: string | null;
  status: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEventEntity {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

/**
 * High-Scale Database Table Names & Index Registry
 */
export const DB_TABLES = {
  MANDATES: "mandates",
  RUNS: "runs",
  LEDGER_ENTRIES: "ledger_entries",
  PAYMENT_ORDERS: "payment_orders",
  APPROVALS: "approvals",
  REFUNDS: "refunds",
  DISPUTES: "disputes",
  WEBHOOK_EVENTS: "paypal_webhook_events"
} as const;

export const DB_INDEXES = [
  "idx_mandates_owner",
  "idx_mandates_user_id",
  "idx_runs_owner",
  "idx_runs_user_id",
  "idx_runs_mandate_id",
  "idx_ledger_entries_mandate_id",
  "idx_ledger_entries_user_id",
  "idx_payment_orders_status",
  "idx_approvals_run_id",
  "idx_refunds_order_id"
] as const;

