CREATE TABLE IF NOT EXISTS ledger_entries (
  sequence BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  run_id TEXT NOT NULL,
  mandate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  prev_hash CHAR(64) NOT NULL,
  entry_hash CHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS ledger_entries_timestamp_idx ON ledger_entries (timestamp DESC);

CREATE TABLE IF NOT EXISTS mandates (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  purpose TEXT NOT NULL,
  definition JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  mandate_id TEXT NOT NULL REFERENCES mandates(id),
  owner TEXT NOT NULL,
  task TEXT NOT NULL,
  decision TEXT NOT NULL,
  cart JSONB NOT NULL,
  policy JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  approval_url TEXT,
  vault_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  reviewer TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payment_orders(id),
  amount NUMERIC(12, 2),
  status TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mandate_api_keys (
  id UUID PRIMARY KEY,
  mandate_id TEXT NOT NULL REFERENCES mandates(id),
  key_hash CHAR(64) NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS disputes_status_idx ON disputes (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS mandate_api_keys_mandate_idx ON mandate_api_keys (mandate_id) WHERE revoked_at IS NULL;

ALTER TABLE mandates ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS typed_confirm_challenges (
  approval_id UUID PRIMARY KEY REFERENCES approvals(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  nonce_hash CHAR(64) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS typed_refund_challenges (
  run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  nonce_hash CHAR(64) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS cart_hash CHAR(64);
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS capture_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS tracking_status TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_run_id_unique ON payment_orders (run_id);
CREATE INDEX IF NOT EXISTS ledger_entries_run_id_idx ON ledger_entries (run_id);
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User data isolation and high-volume scaling indexes
ALTER TABLE mandates ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_mandates_owner ON mandates (owner);
CREATE INDEX IF NOT EXISTS idx_mandates_user_id ON mandates (user_id);
CREATE INDEX IF NOT EXISTS idx_runs_owner ON runs (owner);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs (user_id);
CREATE INDEX IF NOT EXISTS idx_runs_mandate_id ON runs (mandate_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_mandate_id ON ledger_entries (mandate_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);
CREATE INDEX IF NOT EXISTS idx_approvals_run_id ON approvals (run_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds (order_id);
