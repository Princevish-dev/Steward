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
