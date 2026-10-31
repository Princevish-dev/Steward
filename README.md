# Steward

Steward is a mandate-based purchasing prototype for the PayPal AI Hackathon. An agent may propose a cart, but deterministic policy code decides whether it is automatically approved, sent to a human, or blocked.

## Current scope

- PayPal sandbox only; no production credentials or real-money settlement.
- Product discovery currently uses typed Channel3-style fixtures.
- Payment request construction includes USD validation and run/cart idempotency keys.
- The ledger core is append-only and SHA-256 hash chained.
- Product text is treated as untrusted data and cannot change mandate limits.
- Mandates, runs, orders, approvals, refunds, and disputes persist in PostgreSQL.
- Capture is application-idempotent by PayPal order ID.
- PayPal Vault merchant-initiated orders are exposed at `POST /api/paypal/vault`.
- PayPal webhook signatures are verified at `POST /api/paypal/webhook` using `PAYPAL_WEBHOOK_ID`.
- OpenAPI is available at `/api/openapi`; the typed client is in `src/sdk/steward.ts`.
- MCP-style tools are available at `/api/mcp`.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, then use:

- `/new` to draft a mandate
- `/redteam` to inspect hostile product-text fixtures
- `POST /api/runs` with `{ "owner": "you@example.com", "task": "A4 printer paper and coffee" }`
- `POST /api/ledger/verify` with a ledger entry array

## PostgreSQL persistence

Neon provides both `DATABASE_URL` (pooled runtime connections) and `DATABASE_URL_UNPOOLED`
(direct migration connections). Set them in `.env.local`, then create the ledger table:

```bash
npm run db:migrate
```

Capture events are stored in PostgreSQL and verified from the persisted chain. If `DATABASE_URL` is missing, capture and ledger verification return an explicit configuration error rather than silently using in-memory state.

The expanded migration also creates `mandates`, `runs`, `payment_orders`, `approvals`,
`refunds`, and `disputes`. Run the migration again after pulling the latest code:

```bash
npm run db:migrate
```

For PayPal webhooks, configure the webhook in the PayPal Developer Dashboard and
copy its ID into `PAYPAL_WEBHOOK_ID`. The handler rejects requests without the
PayPal transmission headers or a successful signature verification response.

For Vault payments, supply a PayPal Vault ID obtained through the approved PayPal
vault/consent flow. Never accept a raw card number or store a Vault ID without
the application's encryption and access-control layer in production.

## API and deployment

- `GET /api/openapi` returns the machine-readable API contract.
- `GET/POST /api/mcp` exposes the Steward tool surface for an MCP-compatible adapter.
- `POST /api/paypal/refund` refunds a capture and appends a `PAYMENT_REFUNDED` ledger event.
- `GET/PATCH /api/approvals` provides the `ASK_HUMAN` approval inbox.

The app is ready for a Next.js host such as Vercel or Render. Set all variables
from `.env.example` in the host secret manager, run `npm run db:migrate` against
the direct Neon URL during deployment, and run `npm run build` before starting
with `npm start`. No hosting provider was provisioned automatically because
that requires a provider account and deployment approval.

## Validate

```bash
npm test
npm run typecheck
npm run build
```

No secrets belong in the repository. Copy `.env.example` to `.env.local` only when connecting sandbox services.
